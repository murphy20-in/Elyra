"""Auth-related request/response schemas."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


_PASSWORD_RE = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$"
)


def _validate_password_strength(value: str) -> str:
    if not _PASSWORD_RE.match(value):
        raise ValueError(
            "Password must be ≥8 chars and include 1 uppercase, 1 lowercase, "
            "1 digit, and 1 special character."
        )
    return value


class RegisterRequest(BaseModel):
    email: EmailStr
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{6,14}$")
    password: str = Field(..., min_length=8, max_length=128)
    display_name: Optional[str] = Field(None, max_length=100)
    age: Optional[int] = Field(None, ge=18, le=120)
    gender_identity: Optional[str] = Field(None, max_length=50)
    sexual_orientation: Optional[str] = Field(None, max_length=50)
    pronouns: Optional[str] = Field(None, max_length=30)
    intent: Optional[str] = Field(None, max_length=20)

    @field_validator("password")
    @classmethod
    def _password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 900


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class SendOTPRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{6,14}$")


class VerifyOTPRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{6,14}$")
    otp: str = Field(..., min_length=4, max_length=8)


class OAuthLoginRequest(BaseModel):
    oauth_token: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool
    email_verified: bool
    phone_verified: bool
    is_banned: bool
    last_login: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    created_at: datetime
