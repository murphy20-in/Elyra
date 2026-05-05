import asyncio
import hashlib
import json
import time
from typing import Optional
import httpx
import structlog
from app.backend.core.config import settings
from app.backend.core.metrics import ai_call_latency

logger = structlog.get_logger(__name__)

_circuit_state: dict[str, dict] = {}
CIRCUIT_FAILURE_THRESHOLD = 5
CIRCUIT_OPEN_SECONDS = 60


def _is_circuit_open(service: str) -> bool:
    state = _circuit_state.get(service, {})
    if state.get("open_until", 0) > time.time():
        return True
    return False


def _record_failure(service: str) -> None:
    state = _circuit_state.setdefault(service, {"failures": 0, "open_until": 0})
    state["failures"] += 1
    if state["failures"] >= CIRCUIT_FAILURE_THRESHOLD:
        state["open_until"] = time.time() + CIRCUIT_OPEN_SECONDS
        logger.warning("Circuit breaker opened", service=service)


def _record_success(service: str) -> None:
    _circuit_state[service] = {"failures": 0, "open_until": 0}


async def _post_with_retry(
    url: str,
    payload: dict,
    timeout: float = 5.0,
    max_retries: int = 3,
    service_name: str = "ai_service",
) -> Optional[dict]:
    if _is_circuit_open(service_name):
        logger.warning("Circuit open, skipping call", service=service_name)
        return None
    delay = 0.5
    t0 = time.monotonic()
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                _record_success(service_name)
                ai_call_latency.labels(service=service_name, endpoint="/post").observe(time.monotonic() - t0)
                return response.json()
        except Exception as exc:
            logger.warning("AI service call failed", service=service_name, attempt=attempt+1, error=str(exc))
            _record_failure(service_name)
            if attempt < max_retries - 1:
                await asyncio.sleep(delay)
                delay *= 2
    ai_call_latency.labels(service=service_name, endpoint="/post").observe(time.monotonic() - t0)
    return None


class AIClient:
    def __init__(self):
        self.embedding_url = settings.EMBEDDING_SERVICE_URL
        self.moderation_url = settings.MODERATION_SERVICE_URL
        self.image_url = settings.IMAGE_SERVICE_URL
        self.fake_profile_url = settings.FAKE_PROFILE_SERVICE_URL

    async def generate_embedding(self, text: str, redis=None) -> list[float]:
        cache_key = f"embedding:{hashlib.sha256(text.encode()).hexdigest()}"
        if redis:
            cached = await redis.get(cache_key)
            if cached:
                return json.loads(cached)

        result = await _post_with_retry(
            f"{self.embedding_url}/embed",
            {"text": text},
            timeout=5.0,
            service_name="embedding",
        )
        if result and "embedding" in result:
            if redis:
                await redis.set(cache_key, json.dumps(result["embedding"]), ex=604800)
            return result["embedding"]
        logger.error("Embedding generation failed, returning zero vector")
        return [0.0] * 384

    async def moderate_text(self, text: str, context: str = "chat") -> dict:
        result = await _post_with_retry(
            f"{self.moderation_url}/moderate/text",
            {"text": text, "context": context},
            timeout=5.0,
            service_name="moderation",
        )
        if result:
            return result
        logger.warning("Moderation service unavailable, defaulting to allow")
        return {"is_toxic": False, "toxicity_score": 0.0, "categories": [], "action": "allow"}

    async def moderate_image(self, image_url: str, context: str = "profile_photo", user_id: str = "") -> dict:
        result = await _post_with_retry(
            f"{self.image_url}/moderate/image",
            {"image_url": image_url, "context": context, "user_id": user_id},
            timeout=15.0,
            service_name="image",
        )
        if result:
            return result
        return {"is_safe": True, "confidence": 1.0, "categories": [], "action": "allow"}

    async def verify_face(self, selfie_url: str, profile_url: str, user_id: str) -> dict:
        result = await _post_with_retry(
            f"{self.image_url}/verify/face",
            {"selfie_url": selfie_url, "profile_photo_url": profile_url, "user_id": user_id},
            timeout=15.0,
            service_name="image",
        )
        if result:
            return result
        return {"verified": True, "confidence": 0.95, "message": "service_unavailable_defaulted"}

    async def score_fake_profile(
        self,
        user_id: str,
        bio: str,
        embedding: list[float],
        photo_count: int,
        account_age_days: int,
        email_domain: str,
        phone_country: str,
        neighbor_embeddings: list[list[float]],
    ) -> dict:
        result = await _post_with_retry(
            f"{self.fake_profile_url}/score",
            {
                "user_id": user_id,
                "bio": bio,
                "embedding": embedding,
                "photo_count": photo_count,
                "account_age_days": account_age_days,
                "email_domain": email_domain,
                "phone_country": phone_country,
                "neighbor_embeddings": neighbor_embeddings,
            },
            timeout=5.0,
            service_name="fake_profile",
        )
        if result:
            return result
        return {"fake_probability": 0.0, "factors": [], "action": "allow"}


ai_client = AIClient()


def prepare_embedding_text(
    bio: str,
    gender_identity: str,
    sexual_orientation: str,
    intent: str,
    city: str,
    preferred_genders: list[str],
    age_min: int,
    age_max: int,
) -> str:
    preferred = ', '.join(preferred_genders) if preferred_genders else 'any'
    return (
        f"Bio: {bio or 'No bio provided'}. "
        f"Gender: {gender_identity}. "
        f"Orientation: {sexual_orientation}. "
        f"Intent: {intent}. "
        f"Looking for: {preferred}. "
        f"Age range: {age_min}-{age_max}. "
        f"City: {city or 'India'}."
    )