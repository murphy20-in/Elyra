from datetime import datetime
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class PublicProfileCreate(BaseModel):
    display_name: str = Field(..., max_length=100)
    age: int = Field(..., ge=18, le=100)
    gender_identity: str = Field(..., max_length=50)
    sexual_orientation: str = Field(..., max_length=50)
    pronouns: Optional[str] = Field(None, max_length=30)
    bio: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    intent: Literal["exploring", "serious", "discreet", "friendship"]


class PublicProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=100)
    age: Optional[int] = Field(None, ge=18, le=100)
    gender_identity: Optional[str] = Field(None, max_length=50)
    sexual_orientation: Optional[str] = Field(None, max_length=50)
    pronouns: Optional[str] = Field(None, max_length=30)
    bio: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
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
    pronouns: Optional[str]
    bio: Optional[str]
    city: Optional[str]
    state: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    profile_photo_url: Optional[str]
    photos: list
    intent: str
    is_visible: bool
    created_at: datetime
    updated_at: Optional[datetime]


class PrivateProfileCreate(BaseModel):
    real_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    id_document_url: Optional[str] = None


class PrivateProfileUpdate(BaseModel):
    real_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    id_document_url: Optional[str] = None
    reveal_to: Optional[list[str]] = None


class PrivateProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    reveal_to: list
    created_at: datetime
    updated_at: Optional[datetime]