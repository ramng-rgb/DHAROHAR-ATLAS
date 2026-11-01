import pytest
import httpx
import json
import uuid
from datetime import datetime
from geoalchemy2.elements import WKTElement
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.models.models import Site

BASE_URL = "http://127.0.0.1:8000"

@pytest.mark.asyncio
async def test_nearby_sites_ordering_and_distance():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        res = await client.get("/api/v1/sites/rani-ki-vav/full")
        assert res.status_code == 200
        data = res.json()
        assert data["slug"] == "rani-ki-vav"
        assert "nearby_sites" in data
        nearby = data["nearby_sites"]
        assert len(nearby) > 0
        assert len(nearby) <= 6

        # Assert distance ascending order
        distances = [n["distance_km"] for n in nearby]
        assert distances == sorted(distances), f"Distances not sorted ascending: {distances}"

        # Assert geographical accuracy: Siddhpur (Rudra Mahalaya) should be closest (~29 km)
        closest = nearby[0]
        assert closest["slug"] == "rudra-mahalaya"
        assert 25.0 <= closest["distance_km"] <= 35.0

        # Each nearby site should have required fields
        for n in nearby:
            assert "name" in n
            assert "slug" in n
            assert "distance_km" in n
            assert "site_type" in n
            assert "has_3d_model" in n

@pytest.mark.asyncio
async def test_citation_formats_exact_structure():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        # 1. BibTeX
        res_bib = await client.get("/api/v1/sites/rani-ki-vav/cite?format=bibtex")
        assert res_bib.status_code == 200
        assert "application/x-bibtex" in res_bib.headers["content-type"]
        bib_text = res_bib.text
        assert bib_text.startswith("@misc{rani-ki-vav-")
        assert "author = {{Dharohar Atlas Cultural Heritage Archives}}" in bib_text
        assert "title = {Rani ki Vav" in bib_text
        assert "howpublished = {\\url{https://dharohar-atlas.org/sites/rani-ki-vav}}" in bib_text
        assert "Accessed:" in bib_text
        assert "Licenced under" in bib_text

        # 2. APA
        res_apa = await client.get("/api/v1/sites/rani-ki-vav/cite?format=apa")
        assert res_apa.status_code == 200
        assert "text/plain" in res_apa.headers["content-type"]
        apa_text = res_apa.text
        assert apa_text.startswith("Dharohar Atlas. (")
        assert "Rani ki Vav (The Queen's Stepwell)" in apa_text
        assert "Dharohar Atlas Cultural Heritage Archives. Retrieved" in apa_text
        assert "from https://dharohar-atlas.org/sites/rani-ki-vav" in apa_text
        assert "Source:" in apa_text

        # 3. RIS
        res_ris = await client.get("/api/v1/sites/rani-ki-vav/cite?format=ris")
        assert res_ris.status_code == 200
        assert "application/x-research-info-systems" in res_ris.headers["content-type"]
        ris_text = res_ris.text
        assert "TY  - ELEC" in ris_text
        assert "TI  - Rani ki Vav" in ris_text
        assert "AU  - Dharohar Atlas Cultural Heritage Archives" in ris_text
        assert "UR  - https://dharohar-atlas.org/sites/rani-ki-vav" in ris_text
        assert "ER  -" in ris_text

        # 4. CSL-JSON
        res_csl = await client.get("/api/v1/sites/rani-ki-vav/cite?format=csl-json")
        assert res_csl.status_code == 200
        assert "application/json" in res_csl.headers["content-type"]
        csl = res_csl.json()
        assert csl["id"] == "rani-ki-vav"
        assert csl["type"] == "webpage"
        assert "Rani ki Vav" in csl["title"]
        assert isinstance(csl["author"], list)
        assert csl["author"][0]["family"] == "Dharohar Atlas Archives"
        assert "issued" in csl and "date-parts" in csl["issued"]
        assert "accessed" in csl and "date-parts" in csl["accessed"]
        assert len(csl["accessed"]["date-parts"][0]) == 3
        assert csl["URL"] == "https://dharohar-atlas.org/sites/rani-ki-vav"
        assert "license" in csl
        assert "source" in csl

@pytest.mark.asyncio
async def test_model_endpoint_headers_and_payload():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        res = await client.get("/api/v1/sites/rani-ki-vav/model")
        assert res.status_code == 200

        # Assert mandatory caching and range headers
        assert "public" in res.headers["cache-control"]
        assert "immutable" in res.headers["cache-control"]
        assert res.headers.get("accept-ranges") == "bytes"

        data = res.json()
        assert data["format"] == "glb"
        assert data["file_size_bytes"] > 0
        assert data["poly_count"] > 0
        assert data["model_url"] == "/models/stepwell_pavilion.opt.glb"
        assert data["licence"] == "CC-BY-4.0"
        assert "Representative architectural reconstruction" in data["attribution"]
        assert data["status"] == "ready"

@pytest.mark.asyncio
async def test_hotspots_ordering_and_vector_data():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        res = await client.get("/api/v1/sites/rani-ki-vav/model")
        assert res.status_code == 200
        data = res.json()
        hotspots = data.get("hotspots", [])
        assert len(hotspots) >= 4

        # Assert sorting order ascending
        sort_orders = [h["sort_order"] for h in hotspots]
        assert sort_orders == sorted(sort_orders)
        assert sort_orders[0] == 1

        for h in hotspots:
            assert h["label"] is not None and len(h["label"]) > 0
            # Multilingual assertions
            assert h["label_hi"] is not None and len(h["label_hi"]) > 0
            assert h["label_gu"] is not None and len(h["label_gu"]) > 0
            # 3D vector coordinates
            assert isinstance(h["position"], list) and len(h["position"]) == 3
            assert isinstance(h["camera_position"], list) and len(h["camera_position"]) == 3
            assert isinstance(h["camera_target"], list) and len(h["camera_target"]) == 3

@pytest.mark.asyncio
async def test_soft_deleted_site_exclusion():
    from app.core.database import engine
    await engine.dispose()
    async with AsyncSessionLocal() as session:
        site = (await session.execute(select(Site).where(Site.slug == "khajuraho-monuments"))).scalar_one_or_none()
        if site:
            site.deleted_at = datetime.utcnow()
            await session.commit()

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        res_full = await client.get("/api/v1/sites/khajuraho-monuments/full")
        assert res_full.status_code == 404

        res_model = await client.get("/api/v1/sites/khajuraho-monuments/model")
        assert res_model.status_code == 404

        res_cite = await client.get("/api/v1/sites/khajuraho-monuments/cite?format=bibtex")
        assert res_cite.status_code == 404

        res_base = await client.get("/api/v1/sites/khajuraho-monuments")
        assert res_base.status_code == 404

    # Restore the site
    await engine.dispose()
    async with AsyncSessionLocal() as session:
        site = (await session.execute(select(Site).where(Site.slug == "khajuraho-monuments"))).scalar_one_or_none()
        if site:
            site.deleted_at = None
            await session.commit()
    await engine.dispose()

@pytest.mark.asyncio
async def test_site_service_direct_unit_coverage():
    from app.core.database import engine
    from app.services.site_service import SiteService
    await engine.dispose()
    async with AsyncSessionLocal() as session:
        service = SiteService(session)

        # 1. Full detail for 3D site
        rani_full = await service.get_site_full("rani-ki-vav")
        assert rani_full is not None
        assert rani_full["has_3d_model"] is True
        assert rani_full["model_summary"] is not None
        assert len(rani_full["nearby_sites"]) > 0
        assert len(rani_full["folklore_items"]) > 0
        assert len(rani_full["observation_items"]) > 0

        # Cached call
        rani_full_cached = await service.get_site_full("rani-ki-vav")
        assert rani_full_cached is not None

        # Full detail for non-existent site
        non_existent = await service.get_site_full("non-existent-site-xyz")
        assert non_existent is None

        # 2. Model for 3D site and non-3D site
        rani_model = await service.get_site_model("rani-ki-vav")
        assert rani_model is not None
        assert len(rani_model["hotspots"]) >= 4

        dholavira_model = await service.get_site_model("dholavira")
        assert dholavira_model is None

        # 3. Citations
        for fmt in ["bibtex", "apa", "ris", "csl-json"]:
            res = await service.get_site_citation("rani-ki-vav", format_type=fmt)
            assert res is not None
            media_type, fname, content = res
            assert len(content) > 0

        # Invalid citation format
        invalid_cite = await service.get_site_citation("rani-ki-vav", format_type="unknown_fmt")
        assert invalid_cite is None

        # 4. OG Metadata
        og = await service.get_site_og("rani-ki-vav")
        assert og is not None
        assert og["has_3d_model"] is True

        og_none = await service.get_site_og("non-existent-site-xyz")
        assert og_none is None

        # 5. List sites with 3D filter
        sites_3d, total_3d, _ = await service.list_sites(has_3d_model=True)
        assert total_3d >= 1
        assert all(s["has_3d_model"] is True for s in sites_3d)

        sites_no_3d, total_no_3d, _ = await service.list_sites(has_3d_model=False)
        assert total_no_3d >= 20
        assert all(s["has_3d_model"] is False for s in sites_no_3d)

        # 6. GeoJSON with 3D filter
        geojson_3d, _ = await service.get_geojson(has_3d_model=True)
        assert geojson_3d["total"] >= 1

        # 7. Facets with 3D
        facets = await service.get_facets(has_3d_model=True)
        assert facets["has_3d_model"]["true"] >= 1
    await engine.dispose()

@pytest.mark.asyncio
async def test_site_without_model_graceful_response():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        # Dholavira does not have a 3D model yet
        res_full = await client.get("/api/v1/sites/dholavira/full")
        assert res_full.status_code == 200
        data = res_full.json()
        assert data["slug"] == "dholavira"
        assert data["has_3d_model"] is False
        assert data["model_summary"] is None
        assert len(data["folklore_items"]) >= 1
        assert len(data["observation_items"]) >= 1

        # Direct model query returns 404 cleanly
        res_model = await client.get("/api/v1/sites/dholavira/model")
        assert res_model.status_code == 404
        assert "not found" in res_model.json()["detail"].lower()

@pytest.mark.asyncio
async def test_facets_and_filtering_has_3d_model():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        res_facets = await client.get("/api/v1/facets")
        assert res_facets.status_code == 200
        facets = res_facets.json()
        assert "has_3d_model" in facets
        assert facets["has_3d_model"]["true"] >= 1
        assert facets["has_3d_model"]["false"] >= 10

        # Filter sites by has_3d_model=true
        res_3d_true = await client.get("/api/v1/sites?has_3d_model=true")
        assert res_3d_true.status_code == 200
        sites_3d = res_3d_true.json()
        assert len(sites_3d) >= 1
        assert all(s["has_3d_model"] is True for s in sites_3d)
        slugs_3d = [s["slug"] for s in sites_3d]
        assert "rani-ki-vav" in slugs_3d

        # Filter sites by has_3d_model=false
        res_3d_false = await client.get("/api/v1/sites?has_3d_model=false")
        assert res_3d_false.status_code == 200
        sites_no_3d = res_3d_false.json()
        assert len(sites_no_3d) >= 20
        assert all(s["has_3d_model"] is False for s in sites_no_3d)
        assert "rani-ki-vav" not in [s["slug"] for s in sites_no_3d]
