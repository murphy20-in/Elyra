"""Profile / preference / photo Pydantic schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


# ── Public profile ───────────────────────────────────────────────────────────


class PublicProfileCreate(BaseModel):
    display_name: str = Field(..., max_length=100)
    age: int = Field(..., ge=18, le=120)
    gender_identity: str = Field(..., max_length=50)
    sexual_orientation: str = Field(..., max_length=50)
    pronouns: Optional[str] = Field(None, max_length=30)
    bio: Optional[str] = Field(None, max_length=4000)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    intent: Literal["exploring", "serious", "discreet", "friendship"]


class PublicProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=100)
    age: Optional[int] = Field(None, ge=18, le=120)
    gender_identity: Optional[str] = Field(None, max_length=50)
    sexual_orientation: Optional[str] = Field(None, max_length=50)
    pronouns: Optional[str] = Field(None, max_length=30)
    bio: Optional[str] = Field(None, max_length=4000)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    intent: Optional[Literal["exploring", "serious", "discreet", "friendship"]] = None
    is_visible: Optional[bool] = None


class PublicProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    display_name: str
    age: int
    gender_identity: str
    sexual_orientation: str
    pronouns: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    profile_photo_url: Optional[str] = None
    photos: list[Any] = []
    intent: str
    is_visible: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None


# ── Private profile ──────────────────────────────────────────────────────────


class PrivateProfileUpdate(BaseModel):
    real_name: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=32)
    address: Optional[str] = Field(None, max_length=1000)
    id_document_url: Optional[str] = Field(None, max_length=500)
    reveal_to: Optional[list[str]] = None


class PrivateProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    reveal_to: list[Any] = []
    created_at: datetime
    updated_at: Optional[datetime] = None


# ── Preferences (re-exported here for routes/profile.py imports) ─────────────


class PreferenceUpdate(BaseModel):
    preferred_genders: Optional[list[str]] = None
    preferred_orientations: Optional[list[str]] = None
    age_min: Optional[int] = Field(None, ge=18, le=120)
    age_max: Optional[int] = Field(None, ge=18, le=120)
    max_distance_km: Optional[int] = Field(None, ge=1, le=500)
    preferred_intents: Optional[list[str]] = None
    deal_breakers: Optional[dict] = None

    @model_validator(mode="after")
    def _check_age_range(self) -> "PreferenceUpdate":
        if (
            self.age_min is not None
            and self.age_max is not None
            and self.age_min > self.age_max
        ):
            raise ValueError("age_min cannot exceed age_max")
        return self


class PreferenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    preferred_genders: list[str] = []
    preferred_orientations: list[str] = []
    age_min: int = 18
    age_max: int = 50
    max_distance_km: int = 50
    preferred_intents: list[str] = []
    deal_breakers: dict = {}
    created_at: datetime
    updated_at: Optional[datetime] = None


# ── Combined "own profile" response ──────────────────────────────────────────


class OwnProfileResponse(BaseModel):
    public: Optional[PublicProfileResponse] = None
    private: Optional[PrivateProfileResponse] = None
    preferences: Optional[PreferenceResponse] = None


class PhotoUploadResponse(BaseModel):
    url: str
    index: int
    photos: list[str]
