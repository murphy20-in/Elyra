from pydantic import BaseModel
from typing import Literal, Optional


class TextModerationRequest(BaseModel):
    text: str
    context: Literal['chat', 'bio', 'report'] = 'chat'
    user_id: Optional[str] = None


class TextModerationResponse(BaseModel):
    is_toxic: bool
    toxicity_score: float
    categories: list[str]
    action: Literal['allow', 'flag', 'block']


class BatchModerationRequest(BaseModel):
    texts: list[TextModerationRequest]


class BatchModerationResponse(BaseModel):
    results: list[TextModerationResponse]
    total: int
    blocked_count: int
    flagged_count: int