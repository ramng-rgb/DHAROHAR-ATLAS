import pytest
from httpx import AsyncClient

BASE_URL = "http://127.0.0.1:8000"

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "dharohar-atlas-api"

@pytest.mark.asyncio
async def test_list_sites():
    async with AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/api/v1/sites?limit=5")
        assert response.status_code == 200
        sites = response.json()
        assert len(sites) >= 1
        assert "name" in sites[0]
        assert "latitude" in sites[0]

@pytest.mark.asyncio
async def test_get_site_by_slug():
    async with AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/api/v1/sites/rani-ki-vav-patan")
        assert response.status_code == 200
        site = response.json()
        assert "Rani ki Vav" in site["name"]
        assert len(site["models_3d"]) > 0
        assert len(site["models_3d"][0]["hotspots"]) >= 3

@pytest.mark.asyncio
async def test_hybrid_search():
    async with AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/api/v1/search?q=Solanki")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] > 0
        assert "results" in data
        assert "grouped" in data

@pytest.mark.asyncio
async def test_ask_the_archive():
    async with AsyncClient(base_url=BASE_URL) as client:
        response = await client.post("/api/v1/ask", json={"question": "Rani ki Vav Queen Udayamati"})
        assert response.status_code == 200
        res = response.json()
        assert "answer" in res
        assert len(res["citations"]) > 0

@pytest.mark.asyncio
async def test_documents_and_correction():
    async with AsyncClient(base_url=BASE_URL) as client:
        # List documents
        doc_res = await client.get("/api/v1/documents")
        assert doc_res.status_code == 200
        docs = doc_res.json()
        assert len(docs) > 0
        
        # Test human-in-the-loop correction on the first OCR line
        first_line = docs[0]["pages"][0]["ocr_lines"][0]
        line_id = first_line["id"]

        patch_res = await client.patch(
            f"/api/v1/lines/{line_id}",
            json={"text": "Peer-reviewed translated transcript by Epigraphist", "reason": "Epigraphist peer review"}
        )
        assert patch_res.status_code == 200
        updated = patch_res.json()
        assert updated["is_corrected"] is True
        assert updated["version"] >= 2
