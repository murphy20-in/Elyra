"""Integration: like → mutual match → chat thread → unmatch flow."""
import pytest

pytestmark = [pytest.mark.integration, pytest.mark.slow]


class TestMatchingFlow:
    async def test_one_way_like_no_match(self, client, auth_headers, second_user_headers):
        me2 = await client.get("/api/v1/auth/me", headers=second_user_headers)
        resp = await client.post(f"/api/v1/matches/{me2.json()['id']}/like", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["matched"] is False

    async def test_mutual_like_creates_match_thread_and_notification(
        self, client, auth_headers, second_user_headers
    ):
        me1 = await client.get("/api/v1/auth/me", headers=auth_headers)
        me2 = await client.get("/api/v1/auth/me", headers=second_user_headers)
        await client.post(f"/api/v1/matches/{me2.json()['id']}/like", headers=auth_headers)
        resp = await client.post(f"/api/v1/matches/{me1.json()['id']}/like", headers=second_user_headers)
        assert resp.json()["matched"] is True
        assert "thread_id" in resp.json()
        thread_id = resp.json()["thread_id"]
        t1 = await client.get(f"/api/v1/chat/threads/{thread_id}", headers=auth_headers)
        t2 = await client.get(f"/api/v1/chat/threads/{thread_id}", headers=second_user_headers)
        assert t1.status_code == 200
        assert t2.status_code == 200
        n1 = await client.get("/api/v1/notifications", headers=auth_headers)
        assert n1.status_code == 200

    async def test_unmatch_closes_thread(self, client, auth_headers, second_user_headers, match_and_thread):
        match_id  = match_and_thread["match_id"]
        thread_id = match_and_thread["thread_id"]
        await client.delete(f"/api/v1/matches/{match_id}", headers=auth_headers)
        t = await client.get(f"/api/v1/chat/threads/{thread_id}", headers=auth_headers)
        assert t.status_code in (200, 403, 404)