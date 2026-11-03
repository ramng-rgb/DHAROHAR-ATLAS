import pytest
import httpx
from datetime import datetime
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.models.models import Site

BASE_URL = "http://127.0.0.1:8000"

@pytest.mark.asyncio
async def test_sites_list_basic_and_filters():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        # All sites
        res = await client.get("/api/v1/sites?limit=50")
        assert res.status_code == 200
        sites = res.json()
        assert len(sites) >= 20

        # Filter by site_type=stepwell
        res_stepwells = await client.get("/api/v1/sites?site_type=stepwell")
        assert res_stepwells.status_code == 200
        stepwells = res_stepwells.json()
        assert len(stepwells) >= 4
        assert all(s["site_type"] == "stepwell" for s in stepwells)

        # Filter by state=Gujarat
        res_gujarat = await client.get("/api/v1/sites?state=Gujarat")
        assert res_gujarat.status_code == 200
        guj_sites = res_gujarat.json()
        assert len(guj_sites) >= 10
        assert all(s["state"] == "Gujarat" for s in guj_sites)

@pytest.mark.asyncio
async def test_bce_year_filtering():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        # Query ancient period: 3000 BCE to 1000 BCE
        res_bce = await client.get("/api/v1/sites?year_from=-3000&year_to=-1000")
        assert res_bce.status_code == 200
        bce_sites = res_bce.json()
        slugs = [s["slug"] for s in bce_sites]
        assert "dholavira" in slugs
        assert "lothal" in slugs

        # Query medieval period: 1000 CE to 1500 CE (should not include Dholavira)
        res_med = await client.get("/api/v1/sites?year_from=1000&year_to=1500")
        assert res_med.status_code == 200
        med_slugs = [s["slug"] for s in res_med.json()]
        assert "dholavira" not in med_slugs
        assert "rani-ki-vav" in med_slugs

@pytest.mark.asyncio
async def test_geojson_viewport_and_clustering():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        # High zoom (>= 8): individual features, unclustered
        res_detail = await client.get("/api/v1/sites/geojson?zoom=10")
        assert res_detail.status_code == 200
        data_detail = res_detail.json()
        assert data_detail["type"] == "FeatureCollection"
        assert data_detail["clustered"] is False
        assert len(data_detail["features"]) >= 20
        # ETag header present
        assert "etag" in res_detail.headers

        # Low zoom (< 7): server-side clustering
        res_clustered = await client.get("/api/v1/sites/geojson?zoom=4")
        assert res_clustered.status_code == 200
        data_clustered = res_clustered.json()
        assert data_clustered["clustered"] is True
        # Check cluster property
        clusters = [f for f in data_clustered["features"] if f["properties"].get("cluster") is True]
        assert len(clusters) > 0
        assert clusters[0]["properties"]["point_count"] > 1

@pytest.mark.asyncio
async def test_live_facet_counts():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        # Overall facets
        res = await client.get("/api/v1/facets")
        assert res.status_code == 200
        facets = res.json()
        assert facets["total_sites"] >= 20
        assert "stepwell" in facets["site_type"]
        assert "Gujarat" in facets["state"]
        assert len(facets["timeline_histogram"]) == 9

        # Filtered facets for Rajasthan
        res_raj = await client.get("/api/v1/facets?state=Rajasthan")
        assert res_raj.status_code == 200
        raj_facets = res_raj.json()
        assert raj_facets["state"].get("Rajasthan", 0) == raj_facets["total_sites"]
        assert raj_facets["state"].get("Gujarat", 0) == 0

@pytest.mark.asyncio
async def test_route_linestring_geometry():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        res = await client.get("/api/v1/routes/gujarat-stepwell-trail")
        assert res.status_code == 200
        route = res.json()
        assert route["slug"] == "gujarat-stepwell-trail"
        assert len(route["stops"]) >= 6
        assert route["geometry"]["type"] == "LineString"
        assert len(route["geometry"]["coordinates"]) == len(route["stops"])
        # Stops have valid sites and arrival notes
        assert route["stops"][0]["site"]["slug"] is not None
        assert route["stops"][0]["arrival_note"] is not None

@pytest.mark.asyncio
async def test_site_detail_and_licensing():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        res = await client.get("/api/v1/sites/rani-ki-vav")
        assert res.status_code == 200
        site = res.json()
        assert site["name"] == "Rani ki Vav (The Queen's Stepwell)"
        assert site["name_hi"] == "रानी की वाव"
        assert site["name_gu"] == "રાણી ની વાવ"
        assert site["data_confidence"] == "verified"
        assert len(site["media"]) > 0
        assert site["media"][0]["license"] is not None
        assert site["media"][0]["attribution"] is not None

@pytest.mark.asyncio
async def test_soft_delete_exclusion():
    # Mark a site as soft-deleted in database
    async with AsyncSessionLocal() as session:
        site = (await session.execute(select(Site).where(Site.slug == "khajuraho-monuments"))).scalar_one_or_none()
        if site:
            site.deleted_at = datetime.utcnow()
            await session.commit()

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        res = await client.get("/api/v1/sites?limit=50")
        assert res.status_code == 200
        slugs = [s["slug"] for s in res.json()]
        assert "khajuraho-monuments" not in slugs

        # 404 for soft-deleted site detail
        res_detail = await client.get("/api/v1/sites/khajuraho-monuments")
        assert res_detail.status_code == 404

    # Restore the site
    async with AsyncSessionLocal() as session:
        site = (await session.execute(select(Site).where(Site.slug == "khajuraho-monuments"))).scalar_one_or_none()
        if site:
            site.deleted_at = None
            await session.commit()
