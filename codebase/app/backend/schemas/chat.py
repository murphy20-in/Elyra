"""Chat / thread Pydantic schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    message_type: Literal["text", "image", "location", "system"] = "text"
    client_message_id: Optional[str] = Field(None, max_length=100)


class MessageResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., alias="_id")
    thread_id: str
    sender_id: str
    content: str
    message_type: str = "text"
    is_moderated: bool = False
    moderation_result: dict[str, Any] = {}
    is_deleted: bool = False
    read_by: list[str] = []
    created_at: datetime
    updated_at: Optional[datetime] = None


class MessageListResponse(BaseModel):
    messages: list[dict[str, Any]] = []
    total: int = 0
    page: int = 1
    has_more: bool = False


class ThreadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    match_id: UUID
    participant_1: UUID
    participant_2: UUID
    is_active: bool = True
    is_anonymous: bool = False
    last_message_at: Optional[datetime] = None
    created_at: datetime


class ThreadListResponse(BaseModel):
    threads: list[ThreadResponse] = []
    total: int = 0


class ThreadUpdateRequest(BaseModel):
    is_anonymous: Optional[bool] = None
