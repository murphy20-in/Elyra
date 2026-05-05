from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PreferenceCreate(BaseModel):
    preferred_genders: list[str] = []
    preferred_orientations: list[str] = []
    age_min: int = 18
    age_max: int = 50
    max_distance_km: int = 50
    preferred_intents: list[str] = []
    deal_breakers: dict = {}


class PreferenceUpdate(BaseModel):
    preferred_genders: Optional[list[str]] = None
    preferred_orientations: Optional[list[str]] = None
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    max_distance_km: Optional[int] = None
    preferred_intents: Optional[list[str]] = None
    deal_breakers: Optional[dict] = None


class PreferenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    preferred_genders: list[str]
    preferred_orientations: list[str]
    age_min: int
    age_max: int
    max_distance_km: int
    preferred_intents: list[str]
    deal_breakers: dict
    created_at: datetime
    updated_at: Optional[datetime]