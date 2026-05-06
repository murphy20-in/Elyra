"""Tests for the moderation AI service (respx-mocked)."""
import pytest
import respx
import httpx
from core.ai_client import AIClient
from core.config import settings

pytestmark = pytest.mark.ai


class TestModerationService:
    @pytest.fixture
    def ai_client(self):
        return AIClient(settings)

    async def test_clean_text_returns_allow(self, ai_client):
        with respx.mock():
            respx.post(f"{settings.MODERATION_SERVICE_URL}/moderate/text").mock(
                return_value=httpx.Response(200, json={
                    "is_toxic": False, "toxicity_score": 0.02,
                    "categories": [], "action": "allow"
                })
            )
            result = await ai_client.moderate_text("Let's meet for coffee!", context="chat")
            assert result["action"] == "allow"

    async def test_toxic_text_returns_flag(self, ai_client):
        with respx.mock():
            respx.post(f"{settings.MODERATION_SERVICE_URL}/moderate/text").mock(
                return_value=httpx.Response(200, json={
                    "is_toxic": True, "toxicity_score": 0.75,
                    "categories": ["harassment"], "action": "flag"
                })
            )
            result = await ai_client.moderate_text("mild offensive content", context="chat")
            assert result["action"] == "flag"