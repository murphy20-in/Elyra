"""
socket.io AsyncServer setup with Redis pub/sub adapter for horizontal scaling.
"""

import logging
import socketio
from datetime import datetime, timezone

from app.backend.core.config import settings
from app.backend.core.database import async_session
from app.backend.core.metrics import ws_connections_active
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.backend.models.chat import ChatThread

from .auth import verify_socket_token
from .rate_limit import check_rate_limit, RateLimitExceeded
from .presence import (
    set_online,
    set_offline,
    get_user_id_for_sid,
    is_online,
    refresh_heartbeat,
)

logger = logging.getLogger(__name__)

# --- Server instantiation ---
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.CORS_ORIGINS,
    client_manager=socketio.AsyncRedisManager(settings.REDIS_URL),
    max_http_buffer_size=64 * 1024,
    async_handlers=True,
)

# Import FastAPI app and wrap it - deferred to avoid circular imports in create_socket_app()
socket_app = None


def create_socket_app(fastapi_app):
    global socket_app
    socket_app = socketio.ASGIApp(sio, other_app=fastapi_app)
    return socket_app


@sio.event
async def connect(sid: str, environ: dict, auth: dict | None):
    """
    Full connection lifecycle:

    1. If auth is None or missing 'token' key → raise ConnectionRefusedError('missing_token')
    2. Call verify_socket_token(auth) from websocket.auth
       → on ValueError/Exception → raise ConnectionRefusedError('auth_failed')
    3. Apply connection rate limit: check_rate_limit(user_id, 'connect', 10, 60)
       → on RateLimitExceeded → raise ConnectionRefusedError('rate_limited')
    4. Call set_online(user_id, sid) from websocket.presence
    5. Fetch all ChatThread IDs where participant_1=user_id OR participant_2=user_id
       AND status != 'closed' (SQLAlchemy async query)
    6. For each thread_id: await sio.enter_room(sid, f"thread_{thread_id}")
    7. Emit 'user_online' to each thread room: { user_id, timestamp }
       (skip the connecting sid itself using skip_sid=sid)
    8. Fetch offline_queue:{user_id} from Redis (LRANGE 0 -1), emit each as 'new_message',
       then DEL the key
    9. Log: logger.info(f"WS connect: user={user_id} sid={sid}")
    """
    if not auth or "token" not in auth:
        logger.warning(f"Missing token in auth for sid={sid}")
        raise ConnectionRefusedError("missing_token")

    try:
        user = await verify_socket_token(auth)
    except ValueError as e:
        logger.warning(f"Auth failed for sid={sid}: {e}")
        raise ConnectionRefusedError("auth_failed")

    user_id = str(user.id)

    try:
        await check_rate_limit(user_id, "connect", 10, 60)
    except RateLimitExceeded:
        logger.warning(f"Rate limit exceeded for user={user_id}")
        raise ConnectionRefusedError("rate_limited")

    await set_online(user_id, sid)
    ws_connections_active.inc()

    async with async_session() as session:
        result = await session.execute(
            select(ChatThread)
            .where(
                (ChatThread.participant_1 == user_id)
                | (ChatThread.participant_2 == user_id)
            )
            .where(ChatThread.is_active == True)
        )
        threads = result.scalars().all()

    for thread in threads:
        thread_id = str(thread.id)
        await sio.enter_room(sid, f"thread_{thread_id}")
        timestamp = datetime.now(timezone.utc).isoformat()
        await sio.emit(
            "user_online",
            {"user_id": user_id, "timestamp": timestamp},
            room=f"thread_{thread_id}",
            skip_sid=sid,
        )

    redis = await get_redis()
    offline_key = f"offline_queue:{user_id}"
    queued_messages = await redis.lrange(offline_key, 0, -1)
    if queued_messages:
        import json
        for msg in queued_messages:
            try:
                msg_data = json.loads(msg)
                await sio.emit("new_message", msg_data, to=sid)
            except Exception as e:
                logger.error(f"Failed to emit offline message: {e}")
        await redis.delete(offline_key)

    logger.info(f"WS connect: user={user_id} sid={sid}")


@sio.event
async def disconnect(sid: str):
    """
    1. get_user_id_for_sid(sid) → user_id (may be None if connect failed early)
    2. If user_id: call set_offline(user_id, sid)
    3. Fetch that user's thread rooms and emit 'user_offline' { user_id, last_seen: now() }
       to each thread room (skip_sid=sid)
    4. Log disconnect
    """
    user_id = await get_user_id_for_sid(sid)

    if not user_id:
        return

    async with async_session() as session:
        result = await session.execute(
            select(ChatThread)
            .where(
                (ChatThread.participant_1 == user_id)
                | (ChatThread.participant_2 == user_id)
            )
            .where(ChatThread.is_active == True)
        )
        threads = result.scalars().all()

    last_seen = datetime.now(timezone.utc).isoformat()

    for thread in threads:
        thread_id = str(thread.id)
        await sio.emit(
            "user_offline",
            {"user_id": user_id, "last_seen": last_seen},
            room=f"thread_{thread_id}",
            skip_sid=sid,
        )

    await set_offline(user_id, sid)
    ws_connections_active.dec()
    logger.info(f"WS disconnect: user={user_id} sid={sid}")


@sio.on("heartbeat")
async def handle_heartbeat(sid: str, data: dict):
    """
    Client sends heartbeat every 30s to keep online status alive.
    1. get_user_id_for_sid(sid)
    2. refresh_heartbeat(user_id) → EXPIRE online:{user_id} 90
    3. Emit 'heartbeat_ack' back to sid
    """
    user_id = await get_user_id_for_sid(sid)
    if not user_id:
        return

    await refresh_heartbeat(user_id)
    timestamp = datetime.now(timezone.utc).isoformat()
    await sio.emit("heartbeat_ack", {"timestamp": timestamp}, to=sid)


async def get_redis():
    from app.backend.core.redis_client import get_redis as gr
    return await gr()