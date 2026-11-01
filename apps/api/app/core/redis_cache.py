import logging
from typing import Optional
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger("dharohar.cache")

_redis_client: Optional[aioredis.Redis] = None

def get_redis_client() -> Optional[aioredis.Redis]:
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

async def get_cache(key: str) -> Optional[str]:
    client = get_redis_client()
    if not client:
        return None
    try:
        return await client.get(key)
    except Exception as e:
        logger.warning(f"Redis get error for key '{key}': {e}")
        return None

async def set_cache(key: str, value: str, expire_seconds: int = 120) -> None:
    client = get_redis_client()
    if not client:
        return
    try:
        await client.set(key, value, ex=expire_seconds)
    except Exception as e:
        logger.warning(f"Redis set error for key '{key}': {e}")
