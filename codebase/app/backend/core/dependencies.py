from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.backend.core.database import get_db
from app.backend.core.redis_client import get_redis
from app.backend.core.security import decode_token
from app.backend.models.user import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"detail": "Invalid token type", "error_code": "INVALID_TOKEN"},
            )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"detail": "Invalid token", "error_code": "INVALID_TOKEN"},
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": str(e), "error_code": "TOKEN_DECODE_ERROR"},
        )

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "User not found", "error_code": "USER_NOT_FOUND"},
        )

    return user


async def get_current_active_user(user: User = Depends(get_current_user)) -> User:
    if user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"detail": "Account deleted", "error_code": "ACCOUNT_DELETED"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"detail": "Account inactive", "error_code": "ACCOUNT_INACTIVE"},
        )

    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"detail": "Account banned", "error_code": "ACCOUNT_BANNED"},
        )

    return user


def require_role(*roles: str):
    async def role_checker(user: User = Depends(get_current_active_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"detail": "Insufficient permissions", "error_code": "INSUFFICIENT_PERMISSIONS"},
            )
        return user

    return role_checker


async def require_verified_email(user: User = Depends(get_current_active_user)) -> User:
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"detail": "Email verification required", "error_code": "EMAIL_NOT_VERIFIED"},
        )
    return user


async def require_active_subscription(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    result = await db.execute(
        text("""
            SELECT tier FROM subscriptions
            WHERE user_id = :user_id
            AND status = 'active'
            AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY created_at DESC
            LIMIT 1
        """),
        {"user_id": str(user.id)}
    )
    row = result.fetchone()

    if not row or row[0] == "free":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"detail": "Active subscription required", "error_code": "SUBSCRIPTION_REQUIRED"},
        )

    return user