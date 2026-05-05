"""Integration: create safe session → check-in → SOS → end."""
import pytest
from datetime import datetime, timedelta

pytestmark = [pytest.mark.integration, pytest.mark.slow]

SESSION_DATA = {
    "emergency_contact_name":  "Integration Parent",
    "emergency_contact_phone": "+919876500000",
    "meeting_location":        "Integration test location",
    "check_in_interval_min":   15,
    "live_location_enabled":   False,
    "scheduled_at":            (datetime.utcnow() + timedelta(hours=1)).isoformat(),
}


class TestSafeDateFlow:
    async def test_full_safe_session_lifecycle(self, client, auth_headers):
        create = await client.post("/api/v1/safety/safe-sessions",
            headers=auth_headers, json=SESSION_DATA)
        assert create.status_code in (200, 201)
        session_id = create.json()["id"]
        check_in = await client.patch(
            f"/api/v1/safety/safe-sessions/{session_id}/check-in",
            headers=auth_headers
        )
        assert check_in.status_code in (200, 204)
        active = await client.get("/api/v1/safety/safe-sessions/active", headers=auth_headers)
        assert active.status_code == 200
        end = await client.post(
            f"/api/v1/safety/safe-sessions/{session_id}/end",
            headers=auth_headers
        )
        assert end.status_code in (200, 204)

    async def test_sos_creates_safety_event(self, client, auth_headers):
        create = await client.post("/api/v1/safety/safe-sessions", headers=auth_headers,
            json={**SESSION_DATA, "emergency_contact_phone": "+919800000001"})
        session_id = create.json()["id"]
        sos = await client.post("/api/v1/safety/sos", headers=auth_headers,
            json={"safe_session_id": session_id, "note": "Integration test SOS"})
        assert sos.status_code in (200, 201)

    async def test_cannot_create_two_active_sessions(self, client, auth_headers):
        await client.post("/api/v1/safety/safe-sessions", headers=auth_headers,
            json={**SESSION_DATA, "emergency_contact_phone": "+919800000002"})
        resp2 = await client.post("/api/v1/safety/safe-sessions", headers=auth_headers,
            json={**SESSION_DATA, "emergency_contact_phone": "+919800000003"})
        assert resp2.status_code == 409