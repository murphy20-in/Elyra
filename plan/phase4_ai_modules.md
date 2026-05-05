# Phase 4: AI Modules

> **Goal**: Implement three AI microservices — Embedding Service, Moderation Service, and Image Service — each as an independent FastAPI app with its own Dockerfile. These services provide the AI layer for matching, content moderation, and image safety.

---

## 4.1 Architecture Overview

```
Backend (main app)
    ├── HTTP POST → Embedding Service       (port 9001)
    │                 └── sentence-transformers model (all-MiniLM-L6-v2, 384-dim)
    ├── HTTP POST → Moderation Service      (port 9002)
    │                 └── toxicity classifier (Detoxify) + keyword blocklist
    ├── HTTP POST → Image Service           (port 9003)
    │                 └── nudity/face stubs (NudeNet/DeepFace pluggable later)
    ├── HTTP POST → Fake Profile Service    (port 9004)
    │                 └── heuristic + embedding-anomaly scorer
    └── (optional) → LLMClient → OpenAI / local Ollama
                      └── conversation starters, smart match explanations
```

All AI services are:
- Independent FastAPI applications
- Docker containers on the internal network (NOT exposed publicly)
- Called via `httpx.AsyncClient` from the backend with timeouts (5s default, 15s for image)
- Retried with exponential backoff (max 3 attempts) via `httpx-retry` or custom logic
- Have `/health` endpoints scraped by backend `/api/v1/health/detailed`
- Cache results in Redis where appropriate (e.g., embedding by `sha256(text)`)

---

## 4.2 Embedding Service (`ai-services/embedding-service/`)

### Purpose
Convert user bio + preferences into a 384-dimensional vector embedding for similarity-based matching. Uses `sentence-transformers/all-MiniLM-L6-v2`.

### Files

#### `main.py`
```python
# FastAPI app with two endpoints

@app.post("/embed")
async def generate_embedding(request: EmbedRequest) -> EmbedResponse:
    """
    Input: { "text": "bio + serialized preferences string" }
    Output: { "embedding": [float, ...], "dimension": 384, "model": "all-MiniLM-L6-v2" }
    """
    # 1. Validate input text is not empty
    # 2. Pass through model.encode()
    # 3. Return embedding vector as list of floats

@app.post("/similarity")
async def compute_similarity(request: SimilarityRequest) -> SimilarityResponse:
    """
    Input: { "embedding_a": [...], "embedding_b": [...] }
    Output: { "cosine_similarity": float }
    """
    # Compute cosine similarity between two vectors

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": model is not None}
```

#### `model.py`
```python
from sentence_transformers import SentenceTransformer
import numpy as np

class EmbeddingModel:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.dimension = 384

    def encode(self, text: str) -> list[float]:
        """Encode text into embedding vector."""
        embedding = self.model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    def cosine_similarity(self, a: list[float], b: list[float]) -> float:
        """Compute cosine similarity between two embeddings."""
        a_np, b_np = np.array(a), np.array(b)
        return float(np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np)))
```

#### `schemas.py`
```python
class EmbedRequest(BaseModel):
    text: str                   # Bio + preferences concatenated
    user_id: Optional[str]      # For logging/tracking

class EmbedResponse(BaseModel):
    embedding: list[float]
    dimension: int
    model: str

class SimilarityRequest(BaseModel):
    embedding_a: list[float]
    embedding_b: list[float]

class SimilarityResponse(BaseModel):
    cosine_similarity: float
```

#### `requirements.txt`
```
fastapi==0.111.0
uvicorn[standard]==0.30.1
sentence-transformers==3.0.1
torch==2.3.1
numpy==1.26.4
pydantic==2.7.4
```

#### `Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Pre-download model during build
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
EXPOSE 9001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9001"]
```

### Integration with Backend
```python
# In backend/services/matching_service.py or a dedicated embedding client

class EmbeddingClient:
    def __init__(self):
        self.base_url = settings.EMBEDDING_SERVICE_URL  # http://embedding-service:9001

    async def generate_embedding(self, text: str) -> list[float]:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/embed", json={"text": text})
            response.raise_for_status()
            return response.json()["embedding"]
```

### Text Preparation for Embedding
```python
def prepare_embedding_text(profile: PublicProfile, preferences: UserPreference) -> str:
    """
    Concatenate bio + preferences into a single text string.
    Format:
      "Bio: {bio}. Gender: {gender_identity}. Orientation: {orientation}.
       Intent: {intent}. Looking for: {preferred_genders}.
       Age range: {age_min}-{age_max}. City: {city}."
    """
```

### When Embeddings are Generated/Updated
1. On `user.registered` event → initial embedding (from registration data) — async via Celery `tasks.regenerate_embedding`
2. On `profile.updated` event → re-generate embedding (debounced 30s in Celery to coalesce rapid edits)
3. On `preferences.updated` event → re-generate embedding

### Embedding Cache
- Backend hashes the prepared text (`sha256`) and uses Redis key `embedding:{hash}` (TTL 7 days) to short-circuit repeat requests for identical content.
- Service-side: in-memory LRU on the model's `.encode()` (size 1024) for hot-text reuse across requests.

---

## 4.3 Moderation Service (`ai-services/moderation-service/`)

### Purpose
Classify text content for toxicity. Used for chat message moderation and profile bio screening.

### Files

#### `main.py`
```python
@app.post("/moderate/text")
async def moderate_text(request: TextModerationRequest) -> TextModerationResponse:
    """
    Input: { "text": "message content", "context": "chat" }
    Output: {
        "is_toxic": bool,
        "toxicity_score": float,        # 0.0 - 1.0
        "categories": ["harassment"],   # detected categories
        "action": "allow" | "flag" | "block"
    }
    """

@app.post("/moderate/batch")
async def moderate_batch(request: BatchModerationRequest) -> BatchModerationResponse:
    """Moderate multiple texts at once for efficiency."""

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": True}
```

#### `classifier.py`
```python
class ToxicityClassifier:
    def __init__(self):
        # Option 1: Use a pre-trained model (e.g., Detoxify)
        # Option 2: Use a simple keyword + pattern-based classifier as minimal working version
        self.threshold_flag = 0.5
        self.threshold_block = 0.8

    def classify(self, text: str) -> dict:
        """
        Returns: {
            "is_toxic": bool,
            "toxicity_score": float,
            "categories": list[str],     # harassment, hate, sexual, threat, profanity
            "action": str                # "allow", "flag", "block"
        }

        Implementation:
        1. Normalize text (lowercase, strip)
        2. Check against keyword blocklist (severe terms → immediate block)
        3. Run through toxicity model (Detoxify or pattern-based)
        4. Score aggregation across categories
        5. Determine action based on thresholds
        """

    def _keyword_check(self, text: str) -> Optional[dict]:
        """Fast-path: check against known harmful patterns/slurs."""

    def _model_predict(self, text: str) -> dict:
        """Run text through the ML model for nuanced classification."""
```

#### `schemas.py`
```python
class TextModerationRequest(BaseModel):
    text: str
    context: Literal['chat', 'bio', 'report'] = 'chat'
    user_id: Optional[str]

class TextModerationResponse(BaseModel):
    is_toxic: bool
    toxicity_score: float
    categories: list[str]
    action: Literal['allow', 'flag', 'block']

class BatchModerationRequest(BaseModel):
    texts: list[TextModerationRequest]

class BatchModerationResponse(BaseModel):
    results: list[TextModerationResponse]
```

#### `requirements.txt`
```
fastapi==0.111.0
uvicorn[standard]==0.30.1
detoxify==0.5.2
torch==2.3.1
pydantic==2.7.4
numpy==1.26.4
```

#### `Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Pre-download detoxify model
RUN python -c "from detoxify import Detoxify; Detoxify('original')"
EXPOSE 9002
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9002"]
```

### Integration with Backend
```python
# In backend/core/events.py — message.sent event handler

async def on_message_sent(message_data: dict):
    """
    1. Call moderation service to check message text
    2. If action == "block": mark message is_deleted=True, notify sender via 'message_moderated' WS event
    3. If action == "flag": mark for human review (auto-create Report), allow delivery, emit 'message_moderated' with reason
    4. If action == "allow": no action needed
    5. Update MongoDB message document with moderation_result
    6. Append toxicity score to user's chat-toxicity rolling window (Redis ZSET) for risk scoring
    """
```

### Bio / Profile Moderation Hook
```python
# Called from backend/services/profile_service.py before persisting bio updates

async def moderate_bio(bio: str) -> dict:
    """
    Calls moderation-service /moderate/text with context='bio'.
    On 'block' → return 422 to user with explanation.
    On 'flag'  → save bio but mark profile as `pending_review` (moderator queue).
    On 'allow' → save normally.
    """
```

### Categories
The classifier returns a per-category map:
```json
{
  "harassment": 0.12,
  "hate":       0.04,
  "sexual":     0.81,
  "threat":     0.02,
  "profanity":  0.65,
  "self_harm":  0.00
}
```
- `is_toxic = max(scores) >= threshold_flag (0.5)`
- `action  = "block" if max(scores) >= 0.8 else "flag" if >= 0.5 else "allow"`
- Top-2 categories above threshold are returned as `categories` list.

---

## 4.4 Image Service (`ai-services/image-service/`)

### Purpose
Stub service for image moderation (nudity detection) and face verification. Implements placeholder logic that can be replaced with real CV models later.

### Files

#### `main.py`
```python
@app.post("/verify/face")
async def verify_face(request: FaceVerifyRequest) -> FaceVerifyResponse:
    """
    Stub: Compare selfie against profile photo.
    Returns: { "verified": True, "confidence": 0.95, "message": "Stub: auto-approved" }
    """

@app.post("/moderate/image")
async def moderate_image(request: ImageModerationRequest) -> ImageModerationResponse:
    """
    Stub: Check image for inappropriate content.
    Returns: { "is_safe": True, "confidence": 1.0, "categories": [], "action": "allow" }
    """

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": True, "note": "stub_service"}
```

#### `schemas.py`
```python
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
    user_id: Optional[str]

class ImageModerationResponse(BaseModel):
    is_safe: bool
    confidence: float
    categories: list[str]       # nudity, violence, etc.
    action: Literal['allow', 'flag', 'block']
```

#### `requirements.txt`
```
fastapi==0.111.0
uvicorn[standard]==0.30.1
pydantic==2.7.4
pillow==10.3.0
httpx==0.27.0
```

#### `Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 9003
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9003"]
```

---

## 4.4b Fake Profile Detection Service (`ai-services/fake-profile-service/`)

### Purpose
Score the likelihood that a profile is fake/duplicate. Required by PrimaryPrompt §3 ("Fake profile detection"). Combines heuristics + embedding-similarity anomaly detection.

### Files

#### `main.py`
```python
@app.post("/score")
async def score_profile(request: FakeProfileRequest) -> FakeProfileResponse:
    """
    Input: {
        "user_id": str,
        "bio": str,
        "embedding": list[float],
        "photo_count": int,
        "account_age_days": int,
        "email_domain": str,
        "phone_country": str,
        "neighbor_embeddings": list[list[float]]   # top-K nearest from pgvector
    }
    Output: {
        "fake_probability": float,        # 0.0 - 1.0
        "factors": [str],                 # which heuristics fired
        "action": "allow" | "review" | "block"
    }
    """
```

#### `detector.py`
```python
class FakeProfileDetector:
    """
    Heuristics (each contributes to score 0..1, weighted sum):
    - photo_count == 0                            → +0.30
    - bio length < 20 chars OR identical-language ratio < 0.5  → +0.15
    - account_age_days < 1                        → +0.10
    - disposable email domain (mailinator, etc.) → +0.20
    - max similarity to existing embeddings > 0.95 (likely clone) → +0.40
    - bio matches known-spam regex (URLs, "DM me on telegram") → +0.25

    Final score is clipped to [0, 1].
    Action: >=0.7 block, >=0.4 review, else allow.
    """
```

### When Called
- After registration (asynchronously, via Celery `tasks.score_new_profile`)
- After every `profile.updated` event
- Periodic re-scoring of accounts < 7 days old (Celery beat)
- High-score accounts (>=0.7) are auto-locked (`is_active=False`) and queued for moderator review

### Files to create
- `ai-services/fake-profile-service/main.py`
- `ai-services/fake-profile-service/detector.py`
- `ai-services/fake-profile-service/schemas.py`
- `ai-services/fake-profile-service/requirements.txt` (`fastapi, uvicorn, pydantic, numpy`)
- `ai-services/fake-profile-service/Dockerfile` (port 9004)

---

## 4.4c LLM Client (`backend/core/llm_client.py`)

> Required by PrimaryPrompt §"AI Layer: OpenAI or open-source LLM".

```python
class LLMClient:
    """
    Provider-agnostic LLM wrapper.
    Provider chosen by env LLM_PROVIDER ('openai' | 'local').
    Used by:
      - Conversation starters in chat (premium feature)
      - Smart match explanations ("You both love hiking and identify as queer")
      - Bio rewrite suggestions (premium)
    """
    async def complete(self, prompt: str, max_tokens: int = 256, temperature: float = 0.7) -> str: ...
    async def chat(self, messages: list[dict]) -> str: ...
```
- OpenAI provider: uses official Anthropic-style SDK call (`openai.AsyncOpenAI`).
- Local provider: `httpx` to Ollama `/api/chat` (`OLLAMA_URL`).
- Caches identical (prompt, params) responses in Redis for 1h.
- All prompts include a system message enforcing safety + LGBTQIA+-affirming language.

---

## 4.5 AI Client Utility (Backend Integration)

Create a unified AI client in the backend:

```python
# File: app/backend/core/ai_client.py

class AIClient:
    """Unified client for all AI microservices."""

    def __init__(self, settings):
        self.embedding_url = settings.EMBEDDING_SERVICE_URL
        self.moderation_url = settings.MODERATION_SERVICE_URL
        self.image_url = settings.IMAGE_SERVICE_URL

    async def generate_embedding(self, text: str) -> list[float]: ...
    async def moderate_text(self, text: str, context: str = "chat") -> dict: ...
    async def moderate_image(self, image_url: str, context: str = "profile_photo") -> dict: ...
    async def verify_face(self, selfie_url: str, profile_url: str, user_id: str) -> dict: ...
    async def score_fake_profile(self, payload: dict) -> dict: ...
```

### Resilience Pattern
- Wrap every call in a circuit breaker (e.g., `pybreaker` or simple Redis-state breaker): after 5 consecutive failures, fall through to a safe default (`action="allow"` for moderation, score=0 for fake-profile) and log a `WARN`/Sentry event.
- Timeout per call: 5 s (text), 15 s (image).
- Exponential backoff retries: 0.5s → 1s → 2s.

---

## 4.6 Risk Scoring Implementation

```python
# File: app/backend/services/trust_safety_service.py

async def calculate_risk_score(user_id: UUID, db: AsyncSession) -> RiskScoreResponse:
    """
    Factors and weights:
    ┌───────────────────────────┬────────┬─────────────────────────────┐
    │ Factor                    │ Weight │ Calculation                 │
    ├───────────────────────────┼────────┼─────────────────────────────┤
    │ Report count              │ 0.30   │ min(reports / 10, 1.0)      │
    │ Upheld report ratio       │ 0.25   │ upheld / total_reports      │
    │ Chat toxicity avg         │ 0.20   │ avg toxicity_score          │
    │ Account age               │ 0.10   │ 1.0 if < 7 days, decay     │
    │ Verification status       │ 0.15   │ 0.0 if verified, 0.5 if not│
    └───────────────────────────┴────────┴─────────────────────────────┘

    Final score: weighted sum, clamped to [0.0, 1.0]
    """
```

---

## 4.7 Phase 4 File Creation Checklist

| # | File | Contents |
|---|------|----------|
| 1 | `ai-services/embedding-service/main.py` | FastAPI app (embed, similarity, health) |
| 2 | `ai-services/embedding-service/model.py` | SentenceTransformer wrapper |
| 3 | `ai-services/embedding-service/schemas.py` | Request/response schemas |
| 4 | `ai-services/embedding-service/requirements.txt` | Dependencies |
| 5 | `ai-services/embedding-service/Dockerfile` | Container definition |
| 6 | `ai-services/moderation-service/main.py` | FastAPI app (moderate, batch, health) |
| 7 | `ai-services/moderation-service/classifier.py` | ToxicityClassifier class (Detoxify + keywords) |
| 8 | `ai-services/moderation-service/blocklist.py` | Curated slur / spam / phishing patterns |
| 9 | `ai-services/moderation-service/schemas.py` | Request/response schemas |
| 10 | `ai-services/moderation-service/requirements.txt` | Dependencies |
| 11 | `ai-services/moderation-service/Dockerfile` | Container definition |
| 12 | `ai-services/image-service/main.py` | FastAPI stub app |
| 13 | `ai-services/image-service/schemas.py` | Request/response schemas |
| 14 | `ai-services/image-service/requirements.txt` | Dependencies |
| 15 | `ai-services/image-service/Dockerfile` | Container definition |
| 16 | `ai-services/fake-profile-service/main.py` | FastAPI app (`/score`, health) |
| 17 | `ai-services/fake-profile-service/detector.py` | Heuristic + anomaly scorer |
| 18 | `ai-services/fake-profile-service/schemas.py` | Request/response schemas |
| 19 | `ai-services/fake-profile-service/requirements.txt` | Dependencies |
| 20 | `ai-services/fake-profile-service/Dockerfile` | Container (port 9004) |
| 21 | `backend/core/ai_client.py` | Unified AI service client (incl. fake-profile) |
| 22 | `backend/core/llm_client.py` | Provider-agnostic LLM wrapper (openai/local) |
| 23 | Update `backend/services/trust_safety_service.py` | Risk scoring formula from §4.6 |
| 24 | Update `backend/core/events.py` | Message moderation hook + fake-profile hook |
| 25 | Update `backend/workers/tasks.py` | `regenerate_embedding`, `score_new_profile`, `recompute_risk` |

---

*Phase 4 complete. Proceed to Phase 5: Chat System.*
