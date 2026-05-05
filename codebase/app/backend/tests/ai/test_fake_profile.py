"""Tests for the fake profile AI service (respx-mocked)."""
import pytest
import respx, httpx
from core.ai_client import AIClient
from core.config import settings

pytestmark = pytest.mark.ai


class TestFakeProfileService:
    @pytest.fixture
    def ai_client(self):
        return AIClient(settings)

    async def test_real_profile_returns_low_score(self, ai_client):
        with respx.mock():
            respx.post(f"{settings.FAKE_PROFILE_SERVICE_URL}/score").mock(
                return_value=httpx.Response(200, json={"is_fake": False, "confidence": 0.05})
            )
            result = await ai_client.score_fake_profile({
                "user_id": "test-id", "has_photo": True, "bio_length": 150
            })
            assert result["is_fake"] is False

    async def test_suspicious_profile_returns_high_score(self, ai_client):
        with respx.mock():
            respx.post(f"{settings.FAKE_PROFILE_SERVICE_URL}/score").mock(
                return_value=httpx.Response(200, json={"is_fake": True, "confidence": 0.92})
            )
            result = await ai_client.score_fake_profile({
                "user_id": "suspicious", "has_photo": False, "bio_length": 0
            })
            assert result["confidence"] > 0.8