"""Notification & device-token Pydantic schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    type: str
    title: str
    body: Optional[str] = None
    data: dict = {}
    is_read: bool = False
    created_at: datetime


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse] = []
    unread_count: int = 0
    total: int = 0
    page: int = 1


class DeviceTokenRegister(BaseModel):
    token: str
    platform: Literal["ios", "android", "web"]


class NotificationPreferences(BaseModel):
    push_match: bool = True
    push_message: bool = True
    push_safety: bool = True
    push_payment: bool = True
    push_system: bool = True
    email_match: bool = True
    email_digest: bool = True
