from pydantic import BaseModel
from typing import Optional


class EmbedRequest(BaseModel):
    text: str
    user_id: Optional[str] = None


class EmbedResponse(BaseModel):
    embedding: list[float]
    dimension: int
    model: str


class SimilarityRequest(BaseModel):
    embedding_a: list[float]
    embedding_b: list[float]


class SimilarityResponse(BaseModel):
    cosine_similarity: float