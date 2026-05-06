"""
socket.io event handlers.
All handlers are registered on the `sio` instance from websocket.manager.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

from app.backend.core.config import settings
from app.backend.core.database import async_session
from sqlalchemy import select

from app.backend.models.chat import ChatThread
from app.backend.models.safety import Block

from app.backend.services.chat_service import ChatService

from .manager import sio
from .rate_limit import check_rate_limit, RateLimitExceeded
from .presence import get_user_id_for_sid, is_online, get_all_online
from .anonymous import AnonymousMessageFilter

logger = logging.getLogger(__name__)
anon_filter = AnonymousMessageFilter()


@sio.on("join_thread")
async def handle_join_thread(sid: str, data: dict):
    """
    Input: { "thread_id": str }

    1. get_user_id_for_sid(sid)
    2. Async query ChatThread where id=thread_id AND
       (participant_1=user_id OR participant_2=user_id).
       If not found → emit 'error' { code: 'forbidden', message: 'thread_not_found' }
    3. If thread.status == 'closed' → emit 'error' { code: 'thread_closed' }
    4. await sio.enter_room(sid, f"thread_{thread_id}")
    5. Emit 'joined_thread' back to sid: { thread_id, timestamp }
    """
    thread_id = data.get("thread_id")
    if not thread_id:
        await sio.emit("error", {"code": "invalid_payload", "message": "thread_id required"}, to=sid)
        return

    user_id = await get_user_id_for_sid(sid)
    if not user_id:
        await sio.emit("error", {"code": "unauthenticated"}, to=sid)
        return

    try:
        thread_uuid = uuid.UUID(thread_id)
    except ValueError:
        await sio.emit("error", {"code": "forbidden", "message": "thread_not_found"}, to=sid)
        return

    async with async_session() as session:
        result = await session.execute(
            select(ChatThread)
            .where(ChatThread.id == thread_uuid)
            .where(
                (ChatThread.participant_1 == user_id)
                | (ChatThread.participant_2 == user_id)
            )
        )
        thread = result.scalar_one_or_none()

    if not thread:
        await sio.emit("error", {"code": "forbidden", "message": "thread_not_found"}, to=sid)
        return

    if not thread.is_active:
        await sio.emit("error", {"code": "thread_closed"}, to=sid)
        return

    await sio.enter_room(sid, f"thread_{thread_id}")
    timestamp = datetime.now(timezone.utc).isoformat()
    await sio.emit("joined_thread", {"thread_id": thread_id, "timestamp": timestamp}, to=sid)


@sio.on("leave_thread")
async def handle_leave_thread(sid: str, data: dict):
    """
    Input: { "thread_id": str }
    await sio.leave_room(sid, f"thread_{thread_id}")
    Emit 'left_thread' back to sid.
    """
    thread_id = data.get("thread_id")
    if thread_id:
        await sio.leave_room(sid, f"thread_{thread_id}")
        await sio.emit("left_thread", {"thread_id": thread_id}, to=sid)


@sio.on("send_message")
async def handle_send_message(sid: str, data: dict):
    """
    Input: {
        "thread_id": str,
        "content": str,
        "message_type": "text" | "image" | "location",
        "client_message_id": str   ← required for idempotency
    }

    Full processing pipeline in handlers.py.
    """
    sender_id = await get_user_id_for_sid(sid)
    if not sender_id:
        await sio.emit("error", {"code": "unauthenticated"}, to=sid)
        return

    thread_id = data.get("thread_id")
    content = data.get("content")
    message_type = data.get("message_type", "text")
    client_message_id = data.get("client_message_id")

    if not thread_id or not content or not client_message_id:
        await sio.emit("error", {"code": "invalid_payload"}, to=sid)
        return

    if len(content) > 4096:
        await sio.emit("error", {"code": "message_too_long"}, to=sid)
        return

    if message_type not in ["text", "image", "location"]:
        await sio.emit("error", {"code": "invalid_payload"}, to=sid)
        return

    try:
        await check_rate_limit(sender_id, "send_message", 30, 60)
    except RateLimitExceeded:
        await sio.emit("error", {"code": "rate_limited", "retry_after": 60}, to=sid)
        return

    try:
        thread_uuid = uuid.UUID(thread_id)
    except ValueError:
        await sio.emit("error", {"code": "forbidden"}, to=sid)
        return

    async with async_session() as session:
        result = await session.execute(
            select(ChatThread)
            .where(ChatThread.id == thread_uuid)
            .where(
                (ChatThread.participant_1 == sender_id)
                | (ChatThread.participant_2 == sender_id)
            )
        )
        thread = result.scalar_one_or_none()

    if not thread:
        await sio.emit("error", {"code": "forbidden"}, to=sid)
        return

    if not thread.is_active:
        await sio.emit("error", {"code": "thread_closed"}, to=sid)
        return

    recipient_id = (
        str(thread.participant_2)
        if str(thread.participant_1) == sender_id
        else str(thread.participant_1)
    )

    async with async_session() as session:
        result = await session.execute(
            select(Block).where(
                ((Block.blocker_id == sender_id) & (Block.blocked_user_id == recipient_id))
                | ((Block.blocker_id == recipient_id) & (Block.blocked_user_id == sender_id))
            )
        )
        block = result.scalar_one_or_none()

    if block:
        await sio.emit("error", {"code": "blocked"}, to=sid)
        return

    chat_service = ChatService()
    existing = await chat_service.find_by_client_message_id(
        thread_id, sender_id, client_message_id
    )
    if existing:
        await sio.emit("new_message", existing, to=sid)
        return

    if message_type == "image":
        if not content.startswith("http://") and not content.startswith("https://"):
            await sio.emit("error", {"code": "invalid_payload"}, to=sid)
            return

    sender_id_for_msg = sender_id
    if thread.is_anonymous:
        sender_id_for_msg = await anon_filter.get_or_create_alias(thread_id, sender_id)

    now = datetime.now(timezone.utc)
    message_doc = {
        "thread_id": thread_id,
        "sender_id": sender_id_for_msg,
        "content": content,
        "message_type": message_type,
        "client_message_id": client_message_id,
        "is_moderated": False,
        "moderation_result": None,
        "is_deleted": False,
        "read_by": [],
        "metadata": {},
        "created_at": now,
        "updated_at": now,
    }

    message_id = await chat_service.save_message(message_doc)

    thread.last_message_at = now
    async with async_session() as session:
        session.add(thread)
        await session.commit()

    outbound = {
        "message_id": message_id,
        "thread_id": thread_id,
        "sender_id": sender_id_for_msg,
        "content": content,
        "message_type": message_type,
        "client_message_id": client_message_id,
        "created_at": now.isoformat(),
    }

    if thread.is_anonymous:
        outbound["sender_id"] = sender_id_for_msg

    room = f"thread_{thread_id}"
    await sio.emit("new_message", outbound, room=room)

    recipient_online = await is_online(recipient_id)
    if not recipient_online:
        redis = await get_redis()
        offline_key = f"offline_queue:{recipient_id}"
        await redis.rpush(offline_key, json.dumps(outbound))

    asyncio.create_task(
        moderate_message_async(message_id, content, thread_id, sender_id)
    )

    await sio.emit(
        "message_sent_ack",
        {"message_id": message_id, "client_message_id": client_message_id, "timestamp": now.isoformat()},
        to=sid,
    )


async def moderate_message_async(
    message_id: str,
    content: str,
    thread_id: str,
    sender_id: str,
):
    """
    Called via asyncio.create_task — never blocks message delivery.
    """
    import uuid

    try:
        import aiohttp
        timeout = aiohttp.ClientTimeout(total=5)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                f"{settings.MODERATION_SERVICE_URL}/moderate/text",
                json={
                    "text": content,
                    "context": "chat",
                    "user_id": sender_id,
                },
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                else:
                    logger.warning(f"Moderation service returned {resp.status}")
                    return
    except Exception as e:
        logger.warning(f"Moderation failed: {e}")
        return

    chat_service = ChatService()
    await chat_service.update_moderation_result(message_id, result)

    action = result.get("action", "allow")

    if action == "block":
        await chat_service.delete_message(message_id, sender_id)
        await sio.emit(
            "message_moderated",
            {"message_id": message_id, "action": "blocked", "reason": result.get("categories", [])},
            room=f"thread_{thread_id}",
        )
    elif action == "flag":
        try:
            report_uuid = uuid.uuid4()
            now = datetime.now(timezone.utc)
            async with async_session() as session:
                from app.backend.models.safety import Report
                report = Report(
                    id=report_uuid,
                    reporter_id=settings.MODERATION_SERVICE_URL,
                    reported_user_id=sender_id,
                    reason="other",
                    description=str(result.get("categories", [])),
                    evidence={"message_id": message_id, "toxicity_score": result.get("toxicity_score", 0)},
                    status="pending",
                    created_at=now,
                )
                session.add(report)
                await session.commit()
        except Exception as e:
            logger.error(f"Failed to create auto-report: {e}")

        await sio.emit(
            "message_moderated",
            {"message_id": message_id, "action": "flagged"},
            room=f"thread_{thread_id}",
        )

    if result.get("toxicity_score"):
        redis = await get_redis()
        now_ts = datetime.now(timezone.utc).timestamp()
        await redis.zadd(f"risk_window:{sender_id}", {str(result["toxicity_score"]): now_ts})


@sio.on("typing_start")
async def handle_typing_start(sid: str, data: dict):
    """
    Input: { "thread_id": str }
    """
    thread_id = data.get("thread_id")
    if not thread_id:
        return

    user_id = await get_user_id_for_sid(sid)
    if not user_id:
        return

    try:
        await check_rate_limit(user_id, "typing", 60, 60)
    except RateLimitExceeded:
        return

    await sio.emit(
        "user_typing",
        {"user_id": user_id, "thread_id": thread_id, "timestamp": datetime.now(timezone.utc).isoformat()},
        room=f"thread_{thread_id}",
        skip_sid=sid,
    )


@sio.on("typing_stop")
async def handle_typing_stop(sid: str, data: dict):
    """
    Input: { "thread_id": str }
    """
    thread_id = data.get("thread_id")
    if not thread_id:
        return

    user_id = await get_user_id_for_sid(sid)
    if not user_id:
        return

    await sio.emit(
        "user_stopped_typing",
        {"user_id": user_id, "thread_id": thread_id},
        room=f"thread_{thread_id}",
        skip_sid=sid,
    )


@sio.on("mark_read")
async def handle_mark_read(sid: str, data: dict):
    """
    Input: { "thread_id": str, "message_ids": [str] }
    """
    thread_id = data.get("thread_id")
    message_ids = data.get("message_ids", [])

    user_id = await get_user_id_for_sid(sid)
    if not user_id or not thread_id or not message_ids:
        return

    chat_service = ChatService()
    await chat_service.mark_read(message_ids, user_id)

    await sio.emit(
        "messages_read",
        {"user_id": user_id, "message_ids": message_ids, "timestamp": datetime.now(timezone.utc).isoformat()},
        room=f"thread_{thread_id}",
        skip_sid=sid,
    )


@sio.on("get_online_status")
async def handle_get_online_status(sid: str, data: dict):
    """
    Input: { "user_ids": [str] }   (max 50 user_ids per call)
    """
    user_ids = data.get("user_ids", [])
    if not user_ids or len(user_ids) > 50:
        await sio.emit("error", {"code": "invalid_payload"}, to=sid)
        return

    statuses = await get_all_online(user_ids)
    await sio.emit("online_status", {"statuses": statuses}, to=sid)


async def get_redis():
    from app.backend.core.redis_client import get_redis as gr
    return await gr()