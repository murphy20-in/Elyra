import asyncio
import hashlib
import json
from abc import ABC, abstractmethod
from typing import Optional
import httpx
import structlog
from app.backend.core.config import settings

logger = structlog.get_logger(__name__)

SAFETY_SYSTEM_PROMPT = """You are a helpful assistant for Elyra, a privacy-first LGBTQIA+ dating platform.
Always use inclusive, affirming language. Never produce content that is discriminatory, sexual, or harmful.
Respect user privacy — never reference specific user data unless explicitly given in the prompt.
Keep responses warm, concise, and appropriate for a dating platform context."""


class LLMProvider(ABC):
    @abstractmethod
    async def complete(self, prompt: str, system: str = "", max_tokens: int = 256, temperature: float = 0.7) -> str: ...

    @abstractmethod
    async def chat(self, messages: list[dict], max_tokens: int = 256) -> str: ...


class OpenAIProvider(LLMProvider):
    def __init__(self):
        try:
            from openai import AsyncOpenAI
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        except ImportError:
            self.client = None
        self.model = settings.OPENAI_MODEL

    async def complete(self, prompt: str, system: str = "", max_tokens: int = 256, temperature: float = 0.7) -> str:
        if not self.client:
            return ""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        response = await self.client.chat.completions.create(
            model=self.model, messages=messages, max_tokens=max_tokens, temperature=temperature
        )
        return response.choices[0].message.content or ""

    async def chat(self, messages: list[dict], max_tokens: int = 256) -> str:
        if not self.client:
            return ""
        all_messages = [{"role": "system", "content": SAFETY_SYSTEM_PROMPT}] + messages
        response = await self.client.chat.completions.create(
            model=self.model, messages=all_messages, max_tokens=max_tokens
        )
        return response.choices[0].message.content or ""


class LocalProvider(LLMProvider):
    def __init__(self):
        self.base_url = settings.LOCAL_LLM_URL or "http://localhost:11434"
        self.model = "qwen2.5-coder:7b"

    async def complete(self, prompt: str, system: str = "", max_tokens: int = 256, temperature: float = 0.7) -> str:
        messages = []
        sys_msg = system or SAFETY_SYSTEM_PROMPT
        if sys_msg:
            messages.append({"role": "system", "content": sys_msg})
        messages.append({"role": "user", "content": prompt})
        return await self.chat(messages, max_tokens=max_tokens)

    async def chat(self, messages: list[dict], max_tokens: int = 256) -> str:
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {"num_predict": max_tokens},
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(f"{self.base_url}/api/chat", json=payload)
                response.raise_for_status()
                data = response.json()
                return data.get("message", {}).get("content", "")
        except Exception as exc:
            logger.error("Local LLM call failed", error=str(exc))
            return ""


class LLMClient:
    def __init__(self):
        self._provider: Optional[LLMProvider] = None

    def _get_provider(self) -> LLMProvider:
        if self._provider is None:
            if settings.LLM_PROVIDER == "openai" and settings.OPENAI_API_KEY:
                self._provider = OpenAIProvider()
            else:
                self._provider = LocalProvider()
        return self._provider

    def _cache_key(self, prompt: str, params: dict) -> str:
        content = json.dumps({"prompt": prompt, **params}, sort_keys=True)
        return f"llm_cache:{hashlib.sha256(content.encode()).hexdigest()}"

    async def complete(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 256,
        temperature: float = 0.7,
        redis=None,
    ) -> str:
        cache_key = self._cache_key(prompt, {"system": system, "max_tokens": max_tokens, "temp": temperature})
        if redis:
            cached = await redis.get(cache_key)
            if cached:
                return cached

        result = await self._get_provider().complete(prompt, system=system or SAFETY_SYSTEM_PROMPT,
                                                      max_tokens=max_tokens, temperature=temperature)
        if redis and result:
            await redis.set(cache_key, result, ex=3600)
        return result

    async def generate_conversation_starter(self, profile_a: dict, profile_b: dict, redis=None) -> str:
        prompt = (
            f"Generate a warm, inclusive conversation starter for two people on a dating app. "
            f"Person A: {profile_a.get('gender_identity')}, interested in {profile_a.get('intent')}, from {profile_a.get('city', 'India')}. "
            f"Person B: {profile_b.get('gender_identity')}, interested in {profile_b.get('intent')}, from {profile_b.get('city', 'India')}. "
            f"Keep it to one sentence, friendly and non-presumptuous."
        )
        return await self.complete(prompt, max_tokens=80, temperature=0.9, redis=redis)

    async def explain_match(self, score: float, shared_traits: list[str], redis=None) -> str:
        traits_str = ", ".join(shared_traits) if shared_traits else "similar vibes"
        prompt = (
            f"Explain in one warm sentence why two people on a dating app are a {score:.0%} match. "
            f"Shared traits: {traits_str}. Be affirming and concise."
        )
        return await self.complete(prompt, max_tokens=60, temperature=0.7, redis=redis)


llm_client = LLMClient()