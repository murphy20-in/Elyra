"""API tests for /api/v1/auth/* endpoints."""
import pytest

pytestmark = pytest.mark.api

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL    = "/api/v1/auth/login"
ME_URL       = "/api/v1/auth/me"
LOGOUT_URL   = "/api/v1/auth/logout"
REFRESH_URL  = "/api/v1/auth/refresh"


VALID_USER = {
    "email": "authtest@test.elyra.app",
    "password": "TestPass123!",
    "display_name": "Auth Tester",
    "age": 26,
    "gender_identity": "non-binary",
    "sexual_orientation": "queer",
    "intent": "exploring",
    "city": "Pune",
}


class TestRegister:
    async def test_register_success(self, client):
        resp = await client.post(REGISTER_URL, json=VALID_USER)
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    async def test_register_duplicate_email_returns_409(self, client):
        await client.post(REGISTER_URL, json=VALID_USER)
        resp = await client.post(REGISTER_URL, json=VALID_USER)
        assert resp.status_code == 409

    async def test_register_weak_password_returns_422(self, client):
        bad = {**VALID_USER, "email": "pw@test.app", "password": "weak"}
        resp = await client.post(REGISTER_URL, json=bad)
        assert resp.status_code == 422

    async def test_register_underage_returns_422(self, client):
        bad = {**VALID_USER, "email": "young@test.app", "age": 16}
        resp = await client.post(REGISTER_URL, json=bad)
        assert resp.status_code == 422

    async def test_register_missing_required_field_returns_422(self, client):
        bad = {k: v for k, v in VALID_USER.items() if k != "display_name"}
        resp = await client.post(REGISTER_URL, json=bad)
        assert resp.status_code == 422

    async def test_register_creates_public_profile(self, client):
        user = {**VALID_USER, "email": "profile_check@test.app"}
        reg = await client.post(REGISTER_URL, json=user)
        token = reg.json()["access_token"]
        me = await client.get(ME_URL, headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200


class TestLogin:
    async def test_login_success(self, client):
        await client.post(REGISTER_URL, json={**VALID_USER, "email": "login1@test.app"})
        resp = await client.post(LOGIN_URL, json={"email": "login1@test.app", "password": "TestPass123!"})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_login_wrong_password_returns_401(self, client):
        await client.post(REGISTER_URL, json={**VALID_USER, "email": "login2@test.app"})
        resp = await client.post(LOGIN_URL, json={"email": "login2@test.app", "password": "WrongPass!"})
        assert resp.status_code == 401

    async def test_login_nonexistent_user_returns_401(self, client):
        resp = await client.post(LOGIN_URL, json={"email": "ghost@test.app", "password": "AnyPass123!"})
        assert resp.status_code == 401


class TestMe:
    async def test_get_me_success(self, client, auth_headers):
        resp = await client.get(ME_URL, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert "email" in data
        assert "password_hash" not in data

    async def test_get_me_unauthenticated_returns_401(self, client):
        resp = await client.get(ME_URL)
        assert resp.status_code == 401

    async def test_get_me_with_expired_token_returns_401(self, client):
        from core.security import create_access_token
        from datetime import timedelta
        expired_token = create_access_token(
            {"sub": "nonexistent"}, expires_delta=timedelta(seconds=-1)
        )
        resp = await client.get(ME_URL, headers={"Authorization": f"Bearer {expired_token}"})
        assert resp.status_code == 401


class TestRefreshToken:
    async def test_refresh_returns_new_access_token(self, client):
        reg = await client.post(REGISTER_URL, json={**VALID_USER, "email": "refresh@test.app"})
        refresh_token = reg.json()["refresh_token"]
        resp = await client.post(REFRESH_URL, json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_invalid_refresh_token_returns_401(self, client):
        resp = await client.post(REFRESH_URL, json={"refresh_token": "not-a-real-token"})
        assert resp.status_code == 401


class TestLogout:
    async def test_logout_success(self, client, auth_headers):
        resp = await client.post(LOGOUT_URL, headers=auth_headers)
        assert resp.status_code in (200, 204)

    async def test_logout_unauthenticated_returns_401(self, client):
        resp = await client.post(LOGOUT_URL)
        assert resp.status_code == 401


class TestChangePassword:
    async def test_change_password_success(self, client):
        user = {**VALID_USER, "email": "changepw@test.app"}
        reg = await client.post(REGISTER_URL, json=user)
        headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
        resp = await client.post("/api/v1/auth/change-password", headers=headers,
            json={"current_password": user["password"], "new_password": "NewPass456!"})
        assert resp.status_code in (200, 204)

    async def test_change_password_wrong_current_returns_400(self, client, auth_headers):
        resp = await client.post("/api/v1/auth/change-password", headers=auth_headers,
            json={"current_password": "WrongCurrent!", "new_password": "NewPass456!"})
        assert resp.status_code == 400