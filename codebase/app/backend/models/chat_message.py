"""
Pydantic schema for MongoDB chat message documents.
This is NOT a SQLAlchemy model — MongoDB has no ORM schema.
Used for serialization/deserialization only.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ModerationResult(BaseModel):
    is_toxic: bool = False
    toxicity_score: float = 0.0
    categories: list[str] = []
    action: str = "allow"


class ChatMessage(BaseModel):
    id: Optional[str] = None
    thread_id: str
    sender_id: str
    content: str
    message_type: str = "text"
    client_message_id: str = ""
    is_moderated: bool = False
    moderation_result: Optional[ModerationResult] = None
    is_deleted: bool = False
    read_by: list[str] = []
    metadata: dict = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True