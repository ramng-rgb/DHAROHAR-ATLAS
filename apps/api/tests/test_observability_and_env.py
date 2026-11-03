import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app, validate_environment
from app.core.config import settings
from app.core.logging_config import redact_sensitive_data, JSONLogFormatter
import logging

@pytest.mark.asyncio
async def test_liveness_and_readiness_probes():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Liveness probe
        live_resp = await client.get("/health/live")
        assert live_resp.status_code == 200
        live_data = live_resp.json()
        assert live_data["status"] == "healthy"
        assert "timestamp" in live_data

        # Readiness probe
        ready_resp = await client.get("/health/ready")
        assert ready_resp.status_code == 200
        ready_data = ready_resp.json()
        assert ready_data["status"] in ("ready", "degraded")
        assert "checks" in ready_data
        assert "database" in ready_data["checks"]

@pytest.mark.asyncio
async def test_security_headers_enforcement():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"
        assert resp.headers.get("X-Frame-Options") == "DENY"
        assert resp.headers.get("X-XSS-Protection") == "1; mode=block"
        assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert "camera=()" in resp.headers.get("Permissions-Policy", "")
        assert resp.headers.get("X-Request-ID") is not None

def test_environment_validation_fails_loudly_on_malformed_db_url(monkeypatch):
    monkeypatch.setattr(settings, "DATABASE_URL", "invalid_scheme://user:pass@localhost/db")
    with pytest.raises(RuntimeError) as exc_info:
        validate_environment()
    assert "DATABASE_URL must be a PostgreSQL connection URI" in str(exc_info.value)

def test_log_redaction_masks_sensitive_tokens():
    raw_message = "User authenticated with password=super_secret_123 and token: my_secret_jwt"
    redacted = redact_sensitive_data(raw_message)
    assert "super_secret_123" not in redacted
    assert "[REDACTED]" in redacted

@pytest.mark.asyncio
async def test_diagnostic_error_route_handled():
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/test/error")
        # Internal server error should be caught with 500 status code
        assert resp.status_code == 500
