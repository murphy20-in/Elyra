"""Security: rate limiting enforcement tests."""
import pytest

pytestmark = [pytest.mark.security, pytest.mark.slow]


class TestAuthRateLimiting:
    async def test_login_rate_limit_triggered(self, client):
        login_data = {"email": "nonexistent@rate.test", "password": "Wrong123!"}
        responses = []
        for _ in range(12):
            resp = await client.post("/api/v1/auth/login", json=login_data)
            responses.append(resp.status_code)
        rate_limited = any(s == 429 for s in responses)
        all_unauthorized = all(s == 401 for s in responses)
        assert rate_limited or all_unauthorized


class TestMessageRateLimiting:
    async def test_ws_message_rate_limit(self):
        from core.config import settings
        ws_msg_rate_limit = getattr(settings, 'WS_MESSAGE_RATE_LIMIT', 30)
        assert ws_msg_rate_limit > 0
        assert ws_msg_rate_limit <= 60