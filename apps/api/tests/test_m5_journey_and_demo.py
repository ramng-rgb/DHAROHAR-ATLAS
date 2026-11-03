import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.models import Site, Document, Route

BASE_URL = "http://127.0.0.1:8000"

@pytest.mark.asyncio
async def test_journey_endpoint_ordering_and_geometry():
    async with AsyncClient(base_url=BASE_URL) as client:
        # Test flagship Gujarat Stepwell Trail
        resp = await client.get("/api/v1/routes/gujarat-stepwell-trail/journey")
    assert resp.status_code == 200
    data = resp.json()

    assert data["slug"] == "gujarat-stepwell-trail"
    assert "Gujarat Stepwell" in data["title"]
    assert data["total_stops"] == 8
    assert len(data["stops"]) == 8

    # Verify stop ordering
    for idx, stop in enumerate(data["stops"]):
        assert stop["stop_order"] == idx + 1
        assert "site_id" in stop
        assert "site_slug" in stop
        assert "hero_media" in stop
        assert stop["hero_media"]["url"] is not None
        assert "attribution" in stop["hero_media"]
        assert "arrival_note" in stop
        assert "arrival_note_source" in stop

    # Verify cumulative distance increases monotonically
    cum_dist = 0.0
    for stop in data["stops"]:
        assert stop["cumulative_distance_km"] >= cum_dist
        cum_dist = stop["cumulative_distance_km"]

    assert data["total_distance_km"] > 300.0  # ~485 km
    assert data["full_geometry"]["type"] == "LineString"
    assert len(data["full_geometry"]["coordinates"]) == 8

    # Verify stop 5 (Rani ki Vav) has linked 3D model, folklore, observations, and documents
    rani_stop = data["stops"][4]
    assert rani_stop["site_slug"] == "rani-ki-vav"
    assert rani_stop["has_3d_model"] is True
    assert rani_stop["model_3d_id"] is not None
    assert len(rani_stop["linked_folklore"]) >= 1
    assert len(rani_stop["linked_observations"]) >= 1
    assert len(rani_stop["linked_documents"]) >= 1

@pytest.mark.asyncio
async def test_journey_cache_and_etag():
    async with AsyncClient(base_url=BASE_URL) as client:
        # First request
        resp1 = await client.get("/api/v1/routes/gujarat-stepwell-trail/journey")
        assert resp1.status_code == 200
        etag = resp1.headers.get("ETag")
        assert etag is not None
        assert "Cache-Control" in resp1.headers

        # Second request with If-None-Match
        resp2 = await client.get(
            "/api/v1/routes/gujarat-stepwell-trail/journey",
            headers={"If-None-Match": etag}
        )
        assert resp2.status_code == 304

@pytest.mark.asyncio
async def test_second_route_rajasthan_forts():
    async with AsyncClient(base_url=BASE_URL) as client:
        resp = await client.get("/api/v1/routes/rajasthan-forts-trail/journey")
        assert resp.status_code == 200
        data = resp.json()
        assert data["slug"] == "rajasthan-forts-trail"
        assert data["total_stops"] == 4
        assert len(data["stops"]) == 4
        assert data["stops"][0]["site_slug"] == "chittorgarh-fort"
        assert data["stops"][3]["site_slug"] == "chand-baori"

@pytest.mark.asyncio
async def test_demo_script_integrity():
    async with AsyncClient(base_url=BASE_URL) as client:
        resp = await client.get("/api/v1/demo/script")
        assert resp.status_code == 200
        script = resp.json()

        assert script["total_steps"] >= 9
        steps = script["steps"]

        async with AsyncSessionLocal() as session:
            for st in steps:
                assert st["id"] is not None
                assert st["title"] is not None
                assert st["caption"] is not None
                assert st["route"] is not None
                assert st["target_selector"] is not None

                # 1. If site_slug is present, verify site exists
                if st.get("site_slug"):
                    site = (await session.execute(
                        select(Site).where(Site.slug == st["site_slug"])
                    )).scalar_one_or_none()
                    assert site is not None, f"Demo step {st['id']} references missing site {st['site_slug']}"

                # 2. If document_id is present, verify document exists
                if st.get("document_id"):
                    doc = (await session.execute(
                        select(Document).where(Document.id == st["document_id"])
                    )).scalar_one_or_none()
                    assert doc is not None, f"Demo step {st['id']} references missing document {st['document_id']}"

                # 3. If sample_query is present, verify search returns hits
                if st.get("sample_query"):
                    search_resp = await client.get(f"/api/v1/search?q={st['sample_query']}")
                    assert search_resp.status_code == 200
                    res = search_resp.json()
                    assert res["total"] > 0, f"Demo query '{st['sample_query']}' returned zero results!"

                # 4. If sample_question is present, verify Ask returns grounded answer
                if st.get("sample_question"):
                    ask_resp = await client.post("/api/v1/ask", json={"question": st["sample_question"]})
                    assert ask_resp.status_code == 200
                    answer = ask_resp.json()
                    assert answer["answered"] is True, f"Demo question '{st['sample_question']}' was rejected: {answer.get('refusal_reason')}"
                    assert len(answer["citations"]) > 0, f"Demo question '{st['sample_question']}' has zero citations!"
