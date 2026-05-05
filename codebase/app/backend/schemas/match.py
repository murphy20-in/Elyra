from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id_1: UUID
    user_id_2: UUID
    status: str
    liked_by_1: bool
    liked_by_2: bool
    match_score: Optional[float]
    matched_at: Optional[datetime]
    created_at: datetime


class LikeAction(BaseModel):
    target_user_id: UUID


class MatchListResponse(BaseModel):
    matches: list[MatchResponse]
    total: int