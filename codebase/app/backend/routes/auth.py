
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.backend.core.database import get_db
from app.backend.core.redis_client import get_redis
from app.backend.core.dependencies import get_current_active_user
from app.backend.models.user import User
from app.backend.services.auth_service import AuthService
from app.backend.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    TokenRefreshRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    SendOTPRequest,
    VerifyOTPRequest,
    OAuthLoginRequest,
    UserResponse,
)


router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        svc = AuthService(db, redis)
        return await svc.register(data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "VALIDATION_ERROR"},
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        svc = AuthService(db, redis)
        return await svc.login(data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": str(e), "error_code": "AUTH_FAILED"},
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    data: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        svc = AuthService(db, redis)
        return await svc.refresh(data.refresh_token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": str(e), "error_code": "REFRESH_FAILED"},
        )


@router.post("/logout", status_code=204)
async def logout(
    data: TokenRefreshRequest,
    user: User = Depends(get_current_active_user),
    redis=Depends(get_redis),
):
    svc = AuthService(None, redis)
    await svc.logout(data.refresh_token, user.id)


@router.post("/forgot-password", status_code=200)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    svc = AuthService(db, redis)
    await svc.forgot_password(data.email)
    return {"message": "If account exists, reset email was sent"}


@router.post("/reset-password", status_code=200)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        svc = AuthService(db, redis)
        await svc.reset_password(data.token, data.new_password)
        return {"message": "Password reset successful"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "RESET_FAILED"},
        )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_active_user)):
    return user


@router.post("/email/send-verification", status_code=202)
async def send_email_verification(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db, None)
    await svc.send_email_verification(user)
    return {"message": "Verification email sent"}


@router.get("/email/verify", status_code=200)
async def verify_email(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        svc = AuthService(db, None)
        await svc.verify_email(token)
        return {"message": "Email verified successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "VERIFICATION_FAILED"},
        )


@router.post("/phone/send-otp", status_code=202)
async def send_phone_otp(
    data: SendOTPRequest,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db, None)
    await svc.send_phone_otp(user, data.phone)
    return {"message": "OTP sent"}


@router.post("/phone/verify-otp", status_code=200)
async def verify_phone_otp(
    data: VerifyOTPRequest,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        svc = AuthService(db, None)
        await svc.verify_phone_otp(user, data.phone, data.otp)
        return {"message": "Phone verified successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "VERIFICATION_FAILED"},
        )


@router.post("/oauth/{provider}/login", response_model=TokenResponse)
async def oauth_login(
    provider: str,
    data: OAuthLoginRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        svc = AuthService(db, redis)
        return await svc.oauth_login(provider, data.oauth_token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "OAUTH_FAILED"},
        )


@router.post("/change-password", status_code=200)
async def change_password(
    data: ChangePasswordRequest,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        svc = AuthService(db, redis)
        await svc.change_password(user, data.old_password, data.new_password)
        return {"message": "Password changed successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "PASSWORD_CHANGE_FAILED"},
        )