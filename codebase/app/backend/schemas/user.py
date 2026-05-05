from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import EmailStr, Field, ConfigDict


class UserCreate(BaseModel):
    email: EmailStr
    phone: Optional[str] = None
    password: str = Field(..., min_length=8)
    role: str = "user"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    phone: Optional[str]
    role: str
    is_active: bool
    is_verified: bool
    email_verified: bool
    phone_verified: bool
    is_banned: bool
    last_login: Optional[datetime]
    last_seen: Optional[datetime]
    created_at: datetime


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    phone: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefreshRequest(BaseModel):
    refresh_token: str