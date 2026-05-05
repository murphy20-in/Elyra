"""Integration: complete registration → profile → discovery flow."""
import pytest

pytestmark = [pytest.mark.integration, pytest.mark.slow]

NEW_USER = {
    "email":              "integration_reg@test.elyra.app",
    "password":           "IntegTest123!",
    "display_name":       "Integration Reg",
    "age":                27,
    "gender_identity":    "genderqueer",
    "sexual_orientation": "bisexual",
    "intent":             "serious",
    "city":               "Hyderabad",
    "bio":                "Integration test user for registration flow",
}


class TestRegistrationFlow:
    async def test_register_creates_user_and_profile(self, client):
        resp = await client.post("/api/v1/auth/register", json=NEW_USER)
        assert resp.status_code in (200, 201)
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        profile_resp = await client.get("/api/v1/profiles/me", headers=headers)
        assert profile_resp.status_code == 200

    async def test_register_creates_preferences(self, client):
        user = {**NEW_USER, "email": "reg_prefs@test.app"}
        resp = await client.post("/api/v1/auth/register", json=user)
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        prefs_resp = await client.get("/api/v1/profiles/me/preferences", headers=headers)
        assert prefs_resp.status_code == 200

    async def test_register_to_discovery(self, client):
        user = {**NEW_USER, "email": "reg_discover@test.app"}
        resp = await client.post("/api/v1/auth/register", json=user)
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        discover_resp = await client.get("/api/v1/matches/discover", headers=headers)
        assert discover_resp.status_code == 200

    async def test_full_profile_setup(self, client):
        user = {**NEW_USER, "email": "full_setup@test.app"}
        reg = await client.post("/api/v1/auth/register", json=user)
        token = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        update = await client.put("/api/v1/profiles/me", headers=headers,
            json={"bio": "Updated bio", "city": "Chennai"})
        assert update.status_code == 200
        prefs = await client.put("/api/v1/profiles/me/preferences", headers=headers,
            json={"min_age": 20, "max_age": 40, "max_distance_km": 75})
        assert prefs.status_code == 200
        profile = await client.get("/api/v1/profiles/me", headers=headers)
        assert profile.json()["city"] == "Chennai"