"""API tests for /api/v1/matches/* endpoints."""
import pytest

pytestmark = pytest.mark.api


class TestDiscover:
    async def test_discover_returns_candidates(self, client, auth_headers):
        resp = await client.get("/api/v1/matches/discover", headers=auth_headers)
        assert resp.status_code == 200

    async def test_discover_unauthenticated_returns_401(self, client):
        resp = await client.get("/api/v1/matches/discover")
        assert resp.status_code == 401


class TestLike:
    async def test_like_user_success(self, client, auth_headers, second_user_headers):
        me2 = await client.get("/api/v1/auth/me", headers=second_user_headers)
        user2_id = me2.json()["id"]
        resp = await client.post(f"/api/v1/matches/{user2_id}/like", headers=auth_headers)
        assert resp.status_code == 200
        assert "matched" in resp.json()

    async def test_mutual_like_creates_match(self, client, auth_headers, second_user_headers):
        me1 = await client.get("/api/v1/auth/me", headers=auth_headers)
        me2 = await client.get("/api/v1/auth/me", headers=second_user_headers)
        await client.post(f"/api/v1/matches/{me2.json()['id']}/like", headers=auth_headers)
        resp = await client.post(f"/api/v1/matches/{me1.json()['id']}/like", headers=second_user_headers)
        assert resp.status_code == 200
        assert resp.json()["matched"] is True
        assert "thread_id" in resp.json()

    async def test_like_self_returns_400(self, client, auth_headers):
        me = await client.get("/api/v1/auth/me", headers=auth_headers)
        resp = await client.post(f"/api/v1/matches/{me.json()['id']}/like", headers=auth_headers)
        assert resp.status_code == 400


class TestGetMatches:
    async def test_get_matches_returns_list(self, client, auth_headers):
        resp = await client.get("/api/v1/matches", headers=auth_headers)
        assert resp.status_code == 200


class TestPass:
    async def test_pass_user(self, client, auth_headers, second_user_headers):
        me2 = await client.get("/api/v1/auth/me", headers=second_user_headers)
        resp = await client.post(f"/api/v1/matches/{me2.json()['id']}/pass", headers=auth_headers)
        assert resp.status_code in (200, 204)


class TestUnmatch:
    async def test_unmatch(self, client, auth_headers, second_user_headers, match_and_thread):
        resp = await client.delete(f"/api/v1/matches/{match_and_thread['match_id']}", headers=auth_headers)
        assert resp.status_code in (200, 204)

    async def test_unmatch_by_non_participant_returns_403(self, client, match_and_thread):
        reg = await client.post("/api/v1/auth/register", json={
            "email": "third@test.app", "password": "Third123!", "display_name": "Third",
            "age": 25, "gender_identity": "man", "sexual_orientation": "gay",
            "intent": "exploring", "city": "Delhi"
        })
        headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
        resp = await client.delete(f"/api/v1/matches/{match_and_thread['match_id']}", headers=headers)
        assert resp.status_code == 403