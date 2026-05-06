"""Pydantic schema for MongoDB chat message documents.

This is NOT a SQLAlchemy model — MongoDB has no ORM schema.
Used for serialization/deserialization only.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ModerationResult(BaseModel):
    is_toxic: bool = False
    toxicity_score: float = 0.0
    categories: list[str] = []
    action: str = "allow"


class ChatMessage(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[str] = Field(default=None, alias="_id")
    thread_id: str
    sender_id: str
    content: str
    message_type: str = "text"
    client_message_id: str = ""
    is_moderated: bool = False
    moderation_result: Optional[ModerationResult] = None
    is_deleted: bool = False
    read_by: list[str] = []
    extra: dict = Field(default_factory=dict, alias="metadata")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# MongoDB index specifications used by core.mongodb on startup.
MONGO_INDEXES: list[dict] = [
    {"name": "thread_created", "keys": [("thread_id", 1), ("created_at", -1)]},
    {"name": "sender", "keys": [("sender_id", 1)]},
    {"name": "thread_read", "keys": [("thread_id", 1), ("read_by", 1)]},
    {"name": "client_message_id", "keys": [("client_message_id", 1)]},
]
