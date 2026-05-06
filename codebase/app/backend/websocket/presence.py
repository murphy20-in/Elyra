"""
Presence management.

Redis key schema:
  online:{user_id}       → SET 1 EX 90          (heartbeat-extended, 90s TTL)
  ws_sessions            → HSET sid → user_id   (reverse lookup)
  ws_user:{user_id}      → SADD sid             (all sids for a user)

Public functions:
  set_online(user_id, sid)     → set all three keys
  set_offline(user_id, sid)  → SREM sid; if set empty → DEL online key; update users.last_seen
  refresh_heartbeat(user_id)   → EXPIRE online:{user_id} 90
  is_online(user_id) → bool    → EXISTS online:{user_id}
  get_user_id_for_sid(sid)   → HGET ws_sessions sid
  get_all_online(user_ids: list[str]) → dict[str, bool]
"""

import logging
from datetime import datetime, timezone

from app.backend.core.redis_client import get_redis
from app.backend.core.database import async_session
from sqlalchemy import update

from app.backend.models.user import User

logger = logging.getLogger(__name__)


async def set_online(user_id: str, sid: str) -> None:
    """
    Mark a user as online and associate their session ID.
    Sets:
      - online:{user_id} = "1" EX 90
      - ws_sessions sid -> user_id
      - ws_user:{user_id} sid
    """
    redis = await get_redis()
    online_key = f"online:{user_id}"
    sessions_key = f"ws_user:{user_id}"

    pipe = redis.pipeline()
    pipe.set(online_key, "1", ex=90)
    pipe.hset("ws_sessions", sid, user_id)
    pipe.sadd(sessions_key, sid)
    pipe.expire(sessions_key, 90)
    await pipe.execute()

    logger.debug(f"User {user_id} online with sid {sid}")


async def set_offline(user_id: str, sid: str) -> None:
    """
    Mark a user as offline for a given session.
    If no more sessions remain, delete the online key and update last_seen.
    """
    redis = await get_redis()
    online_key = f"online:{user_id}"
    sessions_key = f"ws_user:{user_id}"

    pipe = redis.pipeline()
    pipe.srem(sessions_key, sid)
    pipe.execute()

    remaining = await redis.scard(sessions_key)

    if remaining == 0:
        await redis.delete(online_key, sessions_key)

        async with async_session() as session:
            try:
                await session.execute(
                    update(User)
                    .where(User.id == user_id)
                    .values(last_seen=datetime.now(timezone.utc))
                )
                await session.commit()
            except Exception as e:
                logger.error(f"Failed to update last_seen for {user_id}: {e}")

    await redis.hdel("ws_sessions", sid)
    logger.debug(f"User {user_id} offline (sid {sid})")


async def refresh_heartbeat(user_id: str) -> None:
    """
    Extend the online presence TTL.
    Called on heartbeat from client.
    """
    redis = await get_redis()
    online_key = f"online:{user_id}"
    await redis.expire(online_key, 90)
    logger.debug(f"Heartbeat refreshed for {user_id}")


async def is_online(user_id: str) -> bool:
    """
    Check if a user is currently online.
    """
    redis = await get_redis()
    online_key = f"online:{user_id}"
    return await redis.exists(online_key) > 0


async def get_user_id_for_sid(sid: str) -> str | None:
    """
    Reverse lookup: get user_id from session ID.
    """
    redis = await get_redis()
    return await redis.hget("ws_sessions", sid)


async def get_all_online(user_ids: list[str]) -> dict[str, bool]:
    """
    Batch check online status for multiple users.
    """
    if not user_ids:
        return {}

    redis = await get_redis()
    pipeline = redis.pipeline()
    for user_id in user_ids:
        pipeline.exists(f"online:{user_id}")
    results = await pipeline.execute()

    return {uid: bool(val) for uid, val in zip(user_ids, results)}