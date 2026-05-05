"""
WebSocket JWT auth helper.
Used exclusively by the socket.io connect event.
"""

import logging

from app.backend.core.security import decode_token
from app.backend.core.database import async_session
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.backend.models.user import User

logger = logging.getLogger(__name__)


async def verify_socket_token(auth: dict) -> User:
    """
    Extract and validate JWT from the socket.io auth dict.

    auth dict comes from client:  socket = io(URL, { auth: { token: "Bearer ..." } })

    Steps:
    1. Extract token from auth["token"]; strip "Bearer " prefix if present.
    2. Decode with decode_token() — raises ValueError on invalid/expired.
    3. Extract user_id (sub) from payload.
    4. Async query PostgreSQL: SELECT * FROM users WHERE id = user_id.
    5. If user not found, is_banned=True, or is_active=False → raise ValueError.
    6. Return the User ORM object.

    Raises:
        ValueError: if token missing, invalid, user banned/inactive
    """
    if not auth or "token" not in auth:
        raise ValueError("missing_token")

    token = auth["token"]
    if isinstance(token, str) and token.startswith("Bearer "):
        token = token[7:]

    if not token:
        raise ValueError("missing_token")

    try:
        payload = decode_token(token)
    except ValueError as e:
        logger.warning(f"Token decode failed: {e}")
        raise ValueError("auth_failed") from e

    user_id = payload.get("sub")
    if not user_id:
        raise ValueError("auth_failed")

    async with async_session() as session:
        try:
            result = await session.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Database query failed: {e}")
            raise ValueError("auth_failed") from e

    if not user:
        raise ValueError("auth_failed")

    if user.is_banned:
        logger.warning(f"Banned user attempted connect: {user_id}")
        raise ValueError("auth_failed")

    if not user.is_active:
        logger.warning(f"Inactive user attempted connect: {user_id}")
        raise ValueError("auth_failed")

    logger.debug(f"WebSocket token verified for user: {user_id}")
    return user