from datetime import datetime
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ReportCreate(BaseModel):
    reported_user_id: UUID
    reason: Literal[
        "harassment",
        "fake_profile",
        "inappropriate_content",
        "spam",
        "threatening",
        "other",
    ]
    description: Optional[str] = None
    evidence_urls: list[str] = []


class BlockCreate(BaseModel):
    user_id_to_block: UUID


class SafetyEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    event_type: str
    event_metadata: dict
    latitude: Optional[float]
    longitude: Optional[float]
    resolved: bool
    created_at: datetime


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reporter_id: UUID
    reported_user_id: UUID
    reason: str
    status: str
    created_at: datetime


class BlockResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    blocker_id: UUID
    blocked_user_id: UUID
    created_at: datetime