"""API tests for /api/v1/profiles/* endpoints."""
import pytest

pytestmark = pytest.mark.api


class TestOwnProfile:
    async def test_get_my_profile(self, client, auth_headers):
        resp = await client.get("/api/v1/profiles/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "display_name" in data
        assert "gender_identity" in data

    async def test_update_public_profile(self, client, auth_headers):
        resp = await client.put("/api/v1/profiles/me", headers=auth_headers,
            json={"bio": "Updated bio text", "city": "Hyderabad"})
        assert resp.status_code == 200
        assert resp.json()["bio"] == "Updated bio text"

    async def test_update_profile_unauthenticated_returns_401(self, client):
        resp = await client.put("/api/v1/profiles/me", json={"bio": "x"})
        assert resp.status_code == 401

    async def test_bio_too_long_returns_422(self, client, auth_headers):
        resp = await client.put("/api/v1/profiles/me", headers=auth_headers,
            json={"bio": "x" * 301})
        assert resp.status_code == 422


class TestOtherUserProfile:
    async def test_get_other_user_public_profile(self, client, auth_headers, second_user_headers):
        me2 = await client.get("/api/v1/auth/me", headers=second_user_headers)
        user2_id = me2.json()["id"]
        resp = await client.get(f"/api/v1/profiles/{user2_id}", headers=auth_headers)
        assert resp.status_code == 200

    async def test_private_profile_not_visible_without_reveal(self, client, auth_headers, second_user_headers):
        me2 = await client.get("/api/v1/auth/me", headers=second_user_headers)
        user2_id = me2.json()["id"]
        resp = await client.get(f"/api/v1/profiles/{user2_id}/private", headers=auth_headers)
        assert resp.status_code == 403


class TestPrivateProfile:
    async def test_update_private_profile(self, client, auth_headers):
        resp = await client.put("/api/v1/profiles/me/private", headers=auth_headers,
            json={"real_name": "Real Name Here"})
        assert resp.status_code == 200


class TestPreferences:
    async def test_get_preferences(self, client, auth_headers):
        resp = await client.get("/api/v1/profiles/me/preferences", headers=auth_headers)
        assert resp.status_code == 200

    async def test_update_preferences(self, client, auth_headers):
        resp = await client.put("/api/v1/profiles/me/preferences", headers=auth_headers,
            json={"min_age": 22, "max_age": 35, "max_distance_km": 50})
        assert resp.status_code == 200
        assert resp.json()["min_age"] == 22


class TestProfileReveal:
    async def test_request_reveal(self, client, auth_headers, second_user_headers):
        me2 = await client.get("/api/v1/auth/me", headers=second_user_headers)
        user2_id = me2.json()["id"]
        resp = await client.post(f"/api/v1/profiles/{user2_id}/reveal", headers=auth_headers)
        assert resp.status_code in (200, 201)

    async def test_grant_reveal_then_view_private(
        self, client, auth_headers, second_user_headers
    ):
        me1 = await client.get("/api/v1/auth/me", headers=auth_headers)
        me2 = await client.get("/api/v1/auth/me", headers=second_user_headers)
        user1_id, user2_id = me1.json()["id"], me2.json()["id"]

        await client.post(f"/api/v1/profiles/{user2_id}/reveal", headers=auth_headers)
        await client.post(f"/api/v1/profiles/me/reveal/{user1_id}", headers=second_user_headers)
        resp = await client.get(f"/api/v1/profiles/{user2_id}/private", headers=auth_headers)
        assert resp.status_code == 200