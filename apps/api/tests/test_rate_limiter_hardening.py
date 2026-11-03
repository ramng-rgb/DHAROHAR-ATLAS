import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.core.config import settings
from app.core.rate_limiter import tiered_rate_limiter

@pytest.mark.asyncio
async def test_public_uploads_pause_switch(monkeypatch):
    monkeypatch.setattr(settings, "PUBLIC_UPLOADS_ENABLED", False)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/documents/uploads",
            files={"file": ("test.png", b"\x89PNG\r\n\x1a\nfake", "image/png")}
        )
        assert resp.status_code == 429
        data = resp.json()
        assert "temporarily paused" in data.get("detail", "") or "temporarily paused" in str(data)

@pytest.mark.asyncio
async def test_expensive_ask_daily_quota_enforcement(monkeypatch):
    monkeypatch.setattr(settings, "DAILY_ASK_QUOTA_PER_IP", 3)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 3 allowed queries
        for i in range(3):
            resp = await client.post(
                "/api/v1/search/ask",
                json={"query": f"Question {i} about stepwells", "language": "en"}
            )
            # Either 200 or 400 depending on payload, but not 429
            assert resp.status_code != 429

        # 4th query must be rate limited by daily quota
        resp4 = await client.post(
            "/api/v1/search/ask",
            json={"query": "Exceeded daily quota query", "language": "en"}
        )
        assert resp4.status_code == 429
        data = resp4.json()
        assert "Daily Ask quota exceeded" in str(data)
