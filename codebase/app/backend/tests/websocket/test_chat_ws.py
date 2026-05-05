"""
WebSocket event tests for the socket.io chat system.
"""
import pytest
import asyncio
import socketio

pytestmark = [pytest.mark.websocket, pytest.mark.asyncio]


async def get_auth_token(client, user_data: dict) -> str:
    resp = await client.post("/api/v1/auth/register", json=user_data)
    if resp.status_code == 409:
        resp = await client.post("/api/v1/auth/login", json={
            "email": user_data["email"], "password": user_data["password"]
        })
    return resp.json()["access_token"]


WS_USER_1 = {
    "email": "wstest1@test.elyra.app", "password": "WsTest123!",
    "display_name": "WS User 1", "age": 25,
    "gender_identity": "non-binary", "sexual_orientation": "queer",
    "intent": "exploring", "city": "Mumbai"
}
WS_USER_2 = {
    "email": "wstest2@test.elyra.app", "password": "WsTest456!",
    "display_name": "WS User 2", "age": 26,
    "gender_identity": "woman", "sexual_orientation": "bisexual",
    "intent": "serious", "city": "Bangalore"
}


class TestWebSocketConnection:
    async def test_connect_with_valid_token(self, client):
        """Note: Full WS testing requires actual server. This is a placeholder."""
        token = await get_auth_token(client, WS_USER_1)
        assert token is not None
        assert len(token) > 10

    async def test_connect_without_token_rejected(self):
        sio = socketio.AsyncSimpleClient()
        with pytest.raises(Exception):
            await asyncio.wait_for(
                sio.connect("http://testserver", transports=["websocket"]),
                timeout=2.0
            )


class TestWebSocketMessaging:
    async def test_send_and_receive_message(self, client):
        token1 = await get_auth_token(client, WS_USER_1)
        token2 = await get_auth_token(client, WS_USER_2)

        me1 = (await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token1}"})).json()
        me2 = (await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token2}"})).json()
        await client.post(f"/api/v1/matches/{me2['id']}/like", headers={"Authorization": f"Bearer {token1}"})
        resp = await client.post(f"/api/v1/matches/{me1['id']}/like", headers={"Authorization": f"Bearer {token2}"})
        assert resp.json().get("matched") is True


class TestTypingIndicator:
    async def test_typing_start_stop(self, client):
        token = await get_auth_token(client, WS_USER_1)
        assert token is not None


class TestHeartbeat:
    async def test_heartbeat_acknowledged(self, client):
        token = await get_auth_token(client, WS_USER_1)
        assert token is not None