"""API tests for /api/v1/notifications/* endpoints."""
import pytest

pytestmark = pytest.mark.api


class TestNotifications:
    async def test_get_notifications_empty(self, client, auth_headers):
        resp = await client.get("/api/v1/notifications", headers=auth_headers)
        assert resp.status_code == 200

    async def test_mark_notification_read(self, client, auth_headers):
        resp = await client.post("/api/v1/notifications/mark-all-read", headers=auth_headers)
        assert resp.status_code in (200, 204)

    async def test_register_device_token(self, client, auth_headers):
        resp = await client.post("/api/v1/notifications/device-tokens", headers=auth_headers,
            json={"token": "test-fcm-token-12345", "platform": "android"})
        assert resp.status_code in (200, 201)

    async def test_unauth_notifications_returns_401(self, client):
        resp = await client.get("/api/v1/notifications")
        assert resp.status_code == 401