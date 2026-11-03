import logging

import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger("dharohar.cache")

_redis_client: aioredis.Redis | None = None

def get_redis_client() -> aioredis.Redis | None:
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2.0
            )
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}")
            _redis_client = None
    return _redis_client

async def get_cache(key: str) -> str | None:
    client = get_redis_client()
    if not client:
        return None
    try:
        return await client.get(key)
    except Exception as e:
        logger.warning(f"Redis get error for key '{key}': {e}")
        return None

async def set_cache(key: str, value: str, expire_seconds: int = 120, ttl: int | None = None) -> None:
    client = get_redis_client()
    if not client:
        return
    ex = ttl if ttl is not None else expire_seconds
    try:
        await client.set(key, value, ex=ex)
    except Exception as e:
        logger.warning(f"Redis set error for key '{key}': {e}")
