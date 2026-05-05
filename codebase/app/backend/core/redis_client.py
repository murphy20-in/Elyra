import redis.asyncio as aioredis
from redis.asyncio import Redis
from app.backend.core.config import settings

_redis: Redis | None = None


async def connect_redis() -> None:
    global _redis
    _redis = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
        max_connections=20,
    )


async def disconnect_redis() -> None:
    global _redis
    if _redis:
        await _redis.aclose()


async def get_redis() -> Redis:
    if _redis is None:
        raise RuntimeError("Redis not connected. Call connect_redis() first.")
    return _redis