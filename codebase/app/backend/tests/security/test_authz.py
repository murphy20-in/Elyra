"""Security: RBAC bypass, cross-user data access, token validation."""
import pytest

pytestmark = [pytest.mark.security, pytest.mark.api]


class TestRBACEnforcement:
    async def test_regular_user_cannot_list_reports(self, client, auth_headers):
        resp = await client.get("/api/v1/safety/reports", headers=auth_headers)
        assert resp.status_code == 403

    async def test_moderator_can_list_reports(self, client, moderator_headers):
        resp = await client.get("/api/v1/safety/reports", headers=moderator_headers)
        assert resp.status_code == 200

    async def test_unauthenticated_cannot_access_protected_route(self, client):
        resp = await client.get("/api/v1/profiles/me")
        assert resp.status_code == 401


class TestCrossUserIsolation:
    async def test_user_cannot_read_other_preferences(self, client, auth_headers, second_user_headers):
        me1 = await client.get("/api/v1/auth/me", headers=auth_headers)
        me2 = await client.get("/api/v1/auth/me", headers=second_user_headers)
        resp = await client.get(f"/api/v1/profiles/{me2.json()['id']}/preferences",
                                headers=auth_headers)
        assert resp.status_code in (403, 404)

    async def test_user_cannot_update_other_profile(self, client, auth_headers, second_user_headers):
        me2 = await client.get("/api/v1/auth/me", headers=second_user_headers)
        resp = await client.put(f"/api/v1/profiles/{me2.json()['id']}", headers=auth_headers,
            json={"bio": "hacked bio"})
        assert resp.status_code in (403, 404)


class TestTokenValidation:
    async def test_expired_token_rejected(self, client):
        from core.security import create_access_token
        from datetime import timedelta
        expired = create_access_token({"sub": "some-user-id"}, expires_delta=timedelta(seconds=-1))
        resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired}"})
        assert resp.status_code == 401

    async def test_malformed_token_rejected(self, client):
        resp = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not.a.jwt"})
        assert resp.status_code == 401

    async def test_no_token_rejected(self, client):
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code == 401