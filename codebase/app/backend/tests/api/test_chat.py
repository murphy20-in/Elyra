"""API tests for /api/v1/chat/* REST endpoints."""
import pytest

pytestmark = pytest.mark.api


class TestThreadList:
    async def test_get_threads_returns_list(self, client, auth_headers):
        resp = await client.get("/api/v1/chat/threads", headers=auth_headers)
        assert resp.status_code == 200

    async def test_get_threads_unauthenticated_returns_401(self, client):
        resp = await client.get("/api/v1/chat/threads")
        assert resp.status_code == 401


class TestMessages:
    async def test_get_messages_for_thread(self, client, auth_headers, match_and_thread):
        thread_id = match_and_thread["thread_id"]
        resp = await client.get(f"/api/v1/chat/threads/{thread_id}/messages", headers=auth_headers)
        assert resp.status_code == 200

    async def test_get_messages_non_participant_returns_403(self, client, match_and_thread):
        reg = await client.post("/api/v1/auth/register", json={
            "email": "outsider@test.app", "password": "Outside123!",
            "display_name": "Outsider", "age": 25,
            "gender_identity": "woman", "sexual_orientation": "queer",
            "intent": "exploring", "city": "Mumbai"
        })
        headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
        thread_id = match_and_thread["thread_id"]
        resp = await client.get(f"/api/v1/chat/threads/{thread_id}/messages", headers=headers)
        assert resp.status_code == 403

    async def test_mark_messages_read(self, client, auth_headers, match_and_thread):
        thread_id = match_and_thread["thread_id"]
        resp = await client.post(
            f"/api/v1/chat/threads/{thread_id}/read",
            headers=auth_headers,
            json={"message_ids": []}
        )
        assert resp.status_code in (200, 204)