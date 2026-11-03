import math
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings
from app.core.rate_limiter import tiered_rate_limiter, EndpointCategory

def get_client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")

@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset rate limiter state before and after each test."""
    tiered_rate_limiter.reset()
    yield
    tiered_rate_limiter.reset()

@pytest.mark.asyncio
async def test_exempt_endpoints_not_limited():
    """Verify /health and /ready endpoints are exempt from rate limits."""
    async with get_client() as client:
        for _ in range(25):
            res = await client.get("/health")
            assert res.status_code == 200

        for _ in range(15):
            res = await client.get("/ready")
            assert res.status_code == 200

@pytest.mark.asyncio
async def test_public_endpoint_rate_limiting():
    """Verify public endpoints enforce moderate limits per-IP and return 429 when exceeded."""
    original_limit = settings.RATE_LIMIT_PUBLIC_PER_MINUTE
    settings.RATE_LIMIT_PUBLIC_PER_MINUTE = 5
    
    try:
        async with get_client() as client:
            headers = {"X-Forwarded-For": "198.51.100.1"}
            # Make 5 allowed requests
            for _ in range(5):
                res = await client.get("/api/v1/facets", headers=headers)
                assert res.status_code == 200
                assert res.headers.get("X-RateLimit-Category") == "public"

            # 6th request should be rate-limited
            limited_res = await client.get("/api/v1/facets", headers=headers)
            assert limited_res.status_code == 429
            data = limited_res.json()
            assert "detail" in data
            assert data["category"] == "public"
            assert int(limited_res.headers.get("Retry-After")) > 0
            assert limited_res.headers.get("X-RateLimit-Remaining") == "0"
    finally:
        settings.RATE_LIMIT_PUBLIC_PER_MINUTE = original_limit

@pytest.mark.asyncio
async def test_authenticated_user_looser_limits():
    """Verify authenticated requests receive looser limits compared to public requests."""
    original_public = settings.RATE_LIMIT_PUBLIC_PER_MINUTE
    original_auth = settings.RATE_LIMIT_AUTHENTICATED_PER_MINUTE
    settings.RATE_LIMIT_PUBLIC_PER_MINUTE = 3
    settings.RATE_LIMIT_AUTHENTICATED_PER_MINUTE = 10

    try:
        async with get_client() as client:
            auth_headers = {
                "X-Forwarded-For": "198.51.100.2",
                "Authorization": "Bearer dharohar_test_valid_curator_jwt_token_12345"
            }
            
            # Should allow more requests than the public limit (e.g. 7 requests)
            for i in range(7):
                res = await client.get("/api/v1/facets", headers=auth_headers)
                assert res.status_code == 200
                assert res.headers.get("X-RateLimit-Category") == "authenticated"
                assert int(res.headers.get("X-RateLimit-Limit")) == 10

            # Public client from another IP should fail after 3 requests
            public_headers = {"X-Forwarded-For": "198.51.100.3"}
            for _ in range(3):
                p_res = await client.get("/api/v1/facets", headers=public_headers)
                assert p_res.status_code == 200
            
            p_limited = await client.get("/api/v1/facets", headers=public_headers)
            assert p_limited.status_code == 429
            assert p_limited.headers.get("X-RateLimit-Category") == "public"
    finally:
        settings.RATE_LIMIT_PUBLIC_PER_MINUTE = original_public
        settings.RATE_LIMIT_AUTHENTICATED_PER_MINUTE = original_auth

@pytest.mark.asyncio
async def test_auth_route_per_account_exponential_backoff():
    """Verify stricter per-account limits on auth routes with doubling exponential backoff."""
    orig_acct_limit = settings.RATE_LIMIT_AUTH_PER_ACCOUNT
    orig_base = settings.RATE_LIMIT_AUTH_BASE_BACKOFF
    settings.RATE_LIMIT_AUTH_PER_ACCOUNT = 3
    settings.RATE_LIMIT_AUTH_BASE_BACKOFF = 2.0  # 2s, 4s, 8s...

    try:
        async with get_client() as client:
            headers = {"X-Forwarded-For": "203.0.113.10"}
            payload = {
                "email": "researcher@asi.gov.in",
                "password": "wrong_password_attempt"
            }

            # 3 allowed requests
            for _ in range(3):
                res = await client.post("/api/v1/auth/login", json=payload, headers=headers)
                # 401 is normal for bad creds, but NOT 429
                assert res.status_code in (401, 200)

            # 4th request: 1st excess attempt -> backoff = base * (2^0) = 2.0s
            res_excess_1 = await client.post("/api/v1/auth/login", json=payload, headers=headers)
            assert res_excess_1.status_code == 429
            data1 = res_excess_1.json()
            assert data1["category"] == "auth"
            assert data1["backoff_seconds"] == 2.0
            assert int(res_excess_1.headers.get("Retry-After")) == 2

            # 5th request: 2nd excess attempt -> backoff = base * (2^1) = 4.0s
            res_excess_2 = await client.post("/api/v1/auth/login", json=payload, headers=headers)
            assert res_excess_2.status_code == 429
            data2 = res_excess_2.json()
            assert data2["backoff_seconds"] == 4.0
            assert int(res_excess_2.headers.get("Retry-After")) == 4

            # 6th request: 3rd excess attempt -> backoff = base * (2^2) = 8.0s
            res_excess_3 = await client.post("/api/v1/auth/login", json=payload, headers=headers)
            assert res_excess_3.status_code == 429
            data3 = res_excess_3.json()
            assert data3["backoff_seconds"] == 8.0
            assert int(res_excess_3.headers.get("Retry-After")) == 8

            # Another account from the same IP should still have its own separate account allowance
            other_payload = {
                "email": "curator_other@asi.gov.in",
                "password": "another_password"
            }
            res_other = await client.post("/api/v1/auth/login", json=other_payload, headers=headers)
            assert res_other.status_code == 401  # Not 429! Separate account allowance works
    finally:
        settings.RATE_LIMIT_AUTH_PER_ACCOUNT = orig_acct_limit
        settings.RATE_LIMIT_AUTH_BASE_BACKOFF = orig_base

@pytest.mark.asyncio
async def test_auth_route_per_ip_limit():
    """Verify per-IP limit on auth routes when attacker cycles account usernames."""
    orig_ip_limit = settings.RATE_LIMIT_AUTH_PER_IP
    orig_base = settings.RATE_LIMIT_AUTH_BASE_BACKOFF
    settings.RATE_LIMIT_AUTH_PER_IP = 4
    settings.RATE_LIMIT_AUTH_BASE_BACKOFF = 3.0

    try:
        async with get_client() as client:
            headers = {"X-Forwarded-For": "198.51.100.99"}

            # Attacker tries 4 different accounts from same IP
            for i in range(4):
                payload = {"email": f"victim_{i}@example.com", "password": "password123"}
                res = await client.post("/api/v1/auth/login", json=payload, headers=headers)
                assert res.status_code in (401, 200)

            # 5th attempt from same IP should be blocked by per-IP limit even with a brand new account
            payload_new = {"email": "victim_new_fresh@example.com", "password": "password123"}
            res_blocked = await client.post("/api/v1/auth/login", json=payload_new, headers=headers)
            assert res_blocked.status_code == 429
            assert res_blocked.headers.get("X-RateLimit-Category") == "auth"
            assert float(res_blocked.headers.get("X-RateLimit-Backoff")) >= 3.0
    finally:
        settings.RATE_LIMIT_AUTH_PER_IP = orig_ip_limit
        settings.RATE_LIMIT_AUTH_BASE_BACKOFF = orig_base

@pytest.mark.asyncio
async def test_password_reset_auth_route():
    """Verify password-reset route is protected by auth rate limiting."""
    orig_acct_limit = settings.RATE_LIMIT_AUTH_PER_ACCOUNT
    settings.RATE_LIMIT_AUTH_PER_ACCOUNT = 2
    try:
        async with get_client() as client:
            headers = {"X-Forwarded-For": "198.51.100.42"}
            payload = {"email": "scholar@university.edu"}

            res1 = await client.post("/api/v1/auth/password-reset", json=payload, headers=headers)
            assert res1.status_code == 200
            
            res2 = await client.post("/api/v1/auth/password-reset", json=payload, headers=headers)
            assert res2.status_code == 200

            # 3rd password reset triggers backoff
            res3 = await client.post("/api/v1/auth/password-reset", json=payload, headers=headers)
            assert res3.status_code == 429
            assert res3.headers.get("X-RateLimit-Category") == "auth"
    finally:
        settings.RATE_LIMIT_AUTH_PER_ACCOUNT = orig_acct_limit
