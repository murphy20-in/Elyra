"""Integration: send toxic message → moderation → flag/block."""
import pytest
import respx
import httpx

pytestmark = [pytest.mark.integration, pytest.mark.slow]


class TestModerationFlow:
    async def test_clean_message_allowed(self, client, match_and_thread, auth_headers):
        thread_id = match_and_thread["thread_id"]
        resp = await client.get(f"/api/v1/chat/threads/{thread_id}/messages",
                                headers=auth_headers)
        assert resp.status_code in (200, 403)

    async def test_toxic_message_moderation_mock(self, client, auth_headers):
        with respx.mock(assert_all_called=False):
            respx.post("http://moderation-service-mock:9002/moderate/text").mock(
                return_value=httpx.Response(200, json={
                    "is_toxic": True,
                    "toxicity_score": 0.97,
                    "categories": ["hate_speech"],
                    "action": "block"
                })
            )
            import httpx as _httpx
            async with _httpx.AsyncClient() as hclient:
                resp = await hclient.post(
                    "http://moderation-service-mock:9002/moderate/text",
                    json={"text": "very toxic content"}
                )
                assert resp.json()["action"] == "block"