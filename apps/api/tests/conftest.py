import pytest
from app.core.rate_limiter import tiered_rate_limiter
from app.core.redis_cache import get_redis_client

@pytest.fixture(autouse=True)
async def reset_rate_limiter():
    tiered_rate_limiter.reset()
    client = get_redis_client()
    if client:
        try:
            keys = await client.keys("rl:*") + await client.keys("quota:*")
            if keys:
                await client.delete(*keys)
        except Exception:
            pass
    yield
    tiered_rate_limiter.reset()
    if client:
        try:
            keys = await client.keys("rl:*") + await client.keys("quota:*")
            if keys:
                await client.delete(*keys)
        except Exception:
            pass
