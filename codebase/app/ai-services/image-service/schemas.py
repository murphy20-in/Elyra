from pydantic import BaseModel
from typing import Literal, Optional


class FaceVerifyRequest(BaseModel):
    selfie_url: str
    profile_photo_url: str
    user_id: str


class FaceVerifyResponse(BaseModel):
    verified: bool
    confidence: float
    message: str


class ImageModerationRequest(BaseModel):
    image_url: str
    context: Literal['profile_photo', 'chat_image'] = 'profile_photo'
    user_id: Optional[str] = None


class ImageModerationResponse(BaseModel):
    is_safe: bool
    confidence: float
    categories: list[str]
    action: Literal['allow', 'flag', 'block']