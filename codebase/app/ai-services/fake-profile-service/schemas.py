from pydantic import BaseModel
from typing import Literal


class FakeProfileRequest(BaseModel):
    user_id: str
    bio: str
    embedding: list[float]
    photo_count: int
    account_age_days: int
    email_domain: str
    phone_country: str
    neighbor_embeddings: list[list[float]]


class FakeProfileResponse(BaseModel):
    fake_probability: float
    factors: list[str]
    action: Literal['allow', 'review', 'block']