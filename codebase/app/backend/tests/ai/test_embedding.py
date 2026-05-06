"""Tests for the embedding AI service (respx-mocked)."""
import pytest
import respx
import httpx
from core.ai_client import AIClient
from core.config import settings

pytestmark = pytest.mark.ai


class TestEmbeddingService:
    @pytest.fixture
    def ai_client(self):
        return AIClient(settings)

    async def test_generate_embedding_returns_384_dims(self, ai_client):
        with respx.mock():
            respx.post(f"{settings.EMBEDDING_SERVICE_URL}/embed").mock(
                return_value=httpx.Response(200, json={"embedding": [0.1] * 384})
            )
            embedding = await ai_client.generate_embedding("test text about hiking and coffee")
            assert len(embedding) == 384

    async def test_service_unavailable_fails_gracefully(self, ai_client):
        with respx.mock():
            respx.post(f"{settings.EMBEDDING_SERVICE_URL}/embed").mock(
                return_value=httpx.Response(503)
            )
            with pytest.raises(Exception):
                await ai_client.generate_embedding("test")