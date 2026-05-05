"""
Sliding window rate limiter for WebSocket events.
Uses Redis sorted sets: key = rl:{user_id}:{action}
  ZADD  key  timestamp  uuid
  ZREMRANGEBYSCORE key 0 (now - window_seconds)
  ZCARD key  → if > limit → raise RateLimitExceeded
  EXPIRE key window_seconds
"""

import time
import uuid
from app.backend.core.redis_client import get_redis


class RateLimitExceeded(Exception):
    def __init__(self, retry_after: int = 60):
        self.retry_after = retry_after
        super().__init__(f"Rate limit exceeded. Retry after {retry_after} seconds.")


async def check_rate_limit(
    user_id: str,
    action: str,
    limit: int,
    window_seconds: int,
) -> None:
    """
    Enforce rate limit for user+action pair.

    Limits to enforce (call sites shown):
      - connect:        limit=10,  window=60   (in connect handler)
      - send_message:   limit=30,  window=60   (in handle_send_message)
      - typing:         limit=60,  window=60   (in handle_typing_start)

    Raises RateLimitExceeded if limit exceeded.
    """
    redis = await get_redis()
    key = f"rl:{user_id}:{action}"
    now = time.time()
    window_start = now - window_seconds
    entry_id = str(uuid.uuid4())

    pipe = redis.pipeline()
    pipe.zadd(key, {entry_id: now})
    pipe.zremrangebyscore(key, 0, window_start)
    pipe.zcard(key)
    pipe.expire(key, window_seconds)
    results = await pipe.execute()

    count = results[2]
    if count > limit:
        await redis.zrem(key, entry_id)
        raise RateLimitExceeded(retry_after=window_seconds)