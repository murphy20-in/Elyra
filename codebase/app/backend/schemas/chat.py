from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    message_type: str = "text"


class MessageResponse(BaseModel):
    id: str
    thread_id: str
    sender_id: str
    content: str
    message_type: str
    is_moderated: bool
    moderation_result: dict
    is_deleted: bool
    read_by: list[str]
    created_at: datetime
    updated_at: datetime


class ThreadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    match_id: UUID
    participant_1: UUID
    participant_2: UUID
    is_active: bool
    is_anonymous: bool
    last_message_at: Optional[datetime]
    created_at: datetime