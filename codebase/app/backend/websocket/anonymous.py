"""
Anonymous message identity mapping.
When a ChatThread has is_anonymous=True, sender_id is replaced with
a stable per-thread alias so users can't see each other's real IDs.

Redis key: anon_map:{thread_id}:{real_user_id}  → anon_alias (e.g. "user_a", "user_b")
           anon_rev:{thread_id}:{anon_alias}     → real_user_id
"""

import logging

from app.backend.core.redis_client import get_redis

logger = logging.getLogger(__name__)


class AnonymousMessageFilter:
    """
    Handles anonymous identity mapping for chat threads.
    Each user gets a stable alias per thread.
    """

    @staticmethod
    async def get_or_create_alias(thread_id: str, real_user_id: str) -> str:
        """
        Get or create a stable anonymous alias for a user in a thread.
        First user becomes "user_a", second becomes "user_b", etc.
        """
        redis = await get_redis()
        forward_key = f"anon_map:{thread_id}:{real_user_id}"
        existing = await redis.get(forward_key)
        if existing:
            return existing

        rev_key_base = f"anon_rev:{thread_id}"
        taken_aliases: set = await redis.smembers(rev_key_base)

        available = {"user_a", "user_b", "user_c", "user_d", "user_e"}
        for alias in taken_aliases:
            available.discard(alias)

        new_alias = available.pop() if available else f"user_{len(taken_aliases) + 1}"

        rev_key = f"anon_rev:{thread_id}:{new_alias}"
        pipe = redis.pipeline()
        pipe.set(forward_key, new_alias)
        pipe.set(rev_key, real_user_id)
        pipe.sadd(f"anon_rev:{thread_id}", new_alias)
        await pipe.execute()

        logger.debug(f"Created anon alias {new_alias} for user {real_user_id} in thread {thread_id}")
        return new_alias

    @staticmethod
    async def transform_message(message_doc: dict, thread_id: str) -> dict:
        """
        Replace sender_id with anon alias in the outbound message dict.
        Returns modified copy (do NOT mutate MongoDB doc).
        """
        sender_id = message_doc.get("sender_id")
        if not sender_id:
            return message_doc

        alias = await AnonymousMessageFilter.get_or_create_alias(thread_id, sender_id)

        transformed = message_doc.copy()
        transformed["sender_id"] = alias
        transformed["is_anonymous"] = True

        return transformed

    @staticmethod
    async def get_real_user_id(thread_id: str, alias: str) -> str | None:
        """
        Reverse lookup: get real user_id from alias.
        """
        redis = await get_redis()
        return await redis.get(f"anon_rev:{thread_id}:{alias}")