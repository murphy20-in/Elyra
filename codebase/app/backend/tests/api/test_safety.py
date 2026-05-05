"""API tests for /api/v1/safety/* endpoints."""
import pytest
from datetime import datetime, timedelta

pytestmark = pytest.mark.api

SAFE_SESSION_DATA = {
    "emergency_contact_name":  "Test Parent",
    "emergency_contact_phone": "+919876543210",
    "meeting_location":        "Bandra Bandstand, Mumbai",
    "check_in_interval_min":   30,
    "live_location_enabled":   False,
    "scheduled_at":            (datetime.utcnow() + timedelta(hours=2)).isoformat(),
}


class TestReports:
    async def test_report_user(self, client, auth_headers, second_user_headers):
        me2 = await client.get("/api/v1/auth/me", headers=second_user_headers)
        resp = await client.post("/api/v1/safety/reports", headers=auth_headers,
            json={"reported_user_id": me2.json()["id"], "reason": "harassment",
                  "description": "Test report"})
        assert resp.status_code in (200, 201)

    async def test_report_self_returns_400(self, client, auth_headers):
        me = await client.get("/api/v1/auth/me", headers=auth_headers)
        resp = await client.post("/api/v1/safety/reports", headers=auth_headers,
            json={"reported_user_id": me.json()["id"], "reason": "spam"})
        assert resp.status_code == 400


class TestBlocks:
    async def test_block_user(self, client, auth_headers, second_user_headers):
        me2 = await client.get("/api/v1/auth/me", headers=second_user_headers)
        resp = await client.post("/api/v1/safety/blocks", headers=auth_headers,
            json={"blocked_user_id": me2.json()["id"]})
        assert resp.status_code in (200, 201)

    async def test_block_self_returns_400(self, client, auth_headers):
        me = await client.get("/api/v1/auth/me", headers=auth_headers)
        resp = await client.post("/api/v1/safety/blocks", headers=auth_headers,
            json={"blocked_user_id": me.json()["id"]})
        assert resp.status_code == 400

    async def test_unblock_user(self, client, auth_headers, second_user_headers):
        me2 = await client.get("/api/v1/auth/me", headers=second_user_headers)
        uid = me2.json()["id"]
        await client.post("/api/v1/safety/blocks", headers=auth_headers,
            json={"blocked_user_id": uid})
        resp = await client.delete(f"/api/v1/safety/blocks/{uid}", headers=auth_headers)
        assert resp.status_code in (200, 204)

    async def test_get_block_list(self, client, auth_headers):
        resp = await client.get("/api/v1/safety/blocks", headers=auth_headers)
        assert resp.status_code == 200


class TestSafeSession:
    async def test_create_safe_session(self, client, auth_headers):
        resp = await client.post("/api/v1/safety/safe-sessions", headers=auth_headers,
            json=SAFE_SESSION_DATA)
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert data["status"] == "active"

    async def test_check_in(self, client, auth_headers):
        create = await client.post("/api/v1/safety/safe-sessions", headers=auth_headers,
            json=SAFE_SESSION_DATA)
        session_id = create.json()["id"]
        resp = await client.patch(f"/api/v1/safety/safe-sessions/{session_id}/check-in",
            headers=auth_headers)
        assert resp.status_code in (200, 204)

    async def test_end_session(self, client, auth_headers):
        create = await client.post("/api/v1/safety/safe-sessions", headers=auth_headers,
            json=SAFE_SESSION_DATA)
        session_id = create.json()["id"]
        resp = await client.post(f"/api/v1/safety/safe-sessions/{session_id}/end",
            headers=auth_headers)
        assert resp.status_code in (200, 204)

    async def test_sos_triggers_event(self, client, auth_headers):
        create = await client.post("/api/v1/safety/safe-sessions", headers=auth_headers,
            json=SAFE_SESSION_DATA)
        session_id = create.json()["id"]
        resp = await client.post("/api/v1/safety/sos",
            headers=auth_headers,
            json={"safe_session_id": session_id, "note": "Test SOS"})
        assert resp.status_code in (200, 201)