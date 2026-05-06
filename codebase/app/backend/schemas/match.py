"""Match-related Pydantic schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MatchCandidate(BaseModel):
    user_id: UUID
    display_name: str
    age: int
    gender_identity: str
    sexual_orientation: str
    bio: Optional[str] = None
    photos: list[str] = []
    profile_photo_url: Optional[str] = None
    city: Optional[str] = None
    intent: Optional[str] = None
    distance_km: Optional[float] = None
    compatibility_score: float = 0.0


class DiscoverResponse(BaseModel):
    candidates: list[MatchCandidate]
    page: int = 1
    per_page: int = 20
    total: int = 0
    has_more: bool = False


class MatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id_1: UUID
    user_id_2: UUID
    status: str
    liked_by_1: bool
    liked_by_2: bool
    match_score: Optional[float] = None
    matched_at: Optional[datetime] = None
    created_at: datetime


class LikeAction(BaseModel):
    target_user_id: UUID


class MatchListResponse(BaseModel):
    matches: list[MatchResponse]
    total: int = 0
    page: int = 1
