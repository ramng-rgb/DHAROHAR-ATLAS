import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_garbage_json_rejection_across_routes():
    """Verify that sending malformed JSON to any POST/PATCH route returns a clean 400, never a 500."""
    mutating_routes = [
        "/api/v1/auth/login",
        "/api/v1/auth/signup",
        "/api/v1/auth/password-reset",
        "/api/v1/search/query",
        "/api/v1/search/ask",
        "/api/v1/documents",
        "/api/v1/lines/fake_line_id/edit",
        "/api/v1/translations/fake_trans_id/edit",
        "/api/v1/documents/revert",
    ]

    garbage_payload = b'{"malformed_json_without_closing_brace: 123'
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer dharohar_test_curator_token"
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        for route in mutating_routes:
            res = await client.post(route, content=garbage_payload, headers=headers)
            assert res.status_code == 400, f"Route {route} did not return 400 on garbage JSON, got {res.status_code}"
            data = res.json()
            assert "error" in data, f"Route {route} missing standardized error envelope"
            assert data["error"]["code"] == "MALFORMED_JSON"
            assert "Malformed JSON" in data["error"]["message"]

@pytest.mark.asyncio
async def test_storage_magic_byte_and_size_validation():
    """Verify file uploads enforce magic bytes and maximum size thresholds."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Invalid Magic Bytes (Plain text masquerading as PNG)
        fake_content = b"This is just plain text, definitely not a valid PNG image."
        files = {"file": ("malicious.png", fake_content, "image/png")}
        res_bad_type = await client.post("/api/v1/documents/uploads", files=files)
        assert res_bad_type.status_code == 400
        data_bad = res_bad_type.json()
        assert data_bad["error"]["code"] == "BAD_REQUEST"
        assert "magic bytes" in data_bad["error"]["message"].lower()

        # 2. File Exceeding Size Threshold (>25MB)
        huge_content = b"\x89PNG\r\n\x1a\n" + b"0" * (26 * 1024 * 1024)
        huge_files = {"file": ("huge_scan.png", huge_content, "image/png")}
        res_huge = await client.post("/api/v1/documents/uploads", files=huge_files)
        assert res_huge.status_code == 413
        data_huge = res_huge.json()
        assert data_huge["error"]["code"] == "PAYLOAD_TOO_LARGE"

        # 3. Valid PNG File (Real PNG Magic Header)
        valid_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
        valid_files = {"file": ("authentic_folio.png", valid_png, "image/png")}
        res_valid = await client.post("/api/v1/documents/uploads", files=valid_files)
        assert res_valid.status_code == 200
        assert "storage_key" in res_valid.json()
