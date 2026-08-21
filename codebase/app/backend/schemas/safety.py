"""Safety / Trust & Safety / SafeDate Pydantic schemas."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


_E164 = re.compile(r"^\+[1-9]\d{6,14}$")


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
    description: Optional[str] = Field(None, max_length=4000)
    evidence_urls: list[str] = []


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reporter_id: UUID
    reported_user_id: UUID
    reason: str
    status: str
    description: Optional[str] = None
    created_at: datetime


class BlockCreate(BaseModel):
    blocked_user_id: UUID


class BlockResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    blocker_id: UUID
    blocked_user_id: UUID
    created_at: datetime


class SafeSessionCreate(BaseModel):
    match_id: Optional[UUID] = None
    emergency_contact_name: str = Field(..., max_length=100)
    emergency_contact_phone: str = Field(...)
    meeting_location: Optional[str] = Field(None, max_length=1000)
    scheduled_at: Optional[datetime] = None
    check_in_interval_min: int = Field(30, ge=5, le=240)
    live_location_enabled: bool = False

    @field_validator("emergency_contact_phone")
    @classmethod
    def _validate_phone(cls, v: str) -> str:
        if not _E164.match(v):
            raise ValueError("emergency_contact_phone must be E.164 format (e.g. +919999999999)")
        return v


class SafeSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    match_id: Optional[UUID] = None
    emergency_contact_name: str
    emergency_contact_phone: str
    meeting_location: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    check_in_interval_min: int = 30
    last_check_in: Optional[datetime] = None
    status: str
    live_location_enabled: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    ended_at: Optional[datetime] = None
    created_at: datetime


class LocationUpdate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class SOSTrigger(BaseModel):
    session_id: Optional[UUID] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    note: Optional[str] = Field(None, max_length=2000)


class RiskScoreResponse(BaseModel):
    user_id: UUID
    score: float = Field(..., ge=0, le=1)
    factors: dict = {}


class SafetyEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    event_type: str
    event_metadata: dict = {}
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    resolved: bool = False
    created_at: datetime
