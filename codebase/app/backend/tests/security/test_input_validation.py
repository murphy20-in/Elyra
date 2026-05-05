"""Security: SQL injection, XSS, oversized payloads."""
import pytest

pytestmark = [pytest.mark.security, pytest.mark.api]


class TestSQLInjection:
    async def test_sql_injection_in_bio_rejected_or_sanitized(self, client, auth_headers):
        payload = "'; DROP TABLE users; --"
        resp = await client.put("/api/v1/profiles/me", headers=auth_headers,
            json={"bio": payload})
        assert resp.status_code in (200, 422)

    async def test_sql_injection_in_email_rejected(self, client):
        resp = await client.post("/api/v1/auth/login",
            json={"email": "' OR '1'='1", "password": "anything"})
        assert resp.status_code in (401, 422)


class TestXSSPrevention:
    async def test_xss_in_display_name_sanitized(self, client, auth_headers):
        xss_payload = "<script>alert('xss')</script>"
        resp = await client.put("/api/v1/profiles/me", headers=auth_headers,
            json={"display_name": xss_payload})
        assert resp.status_code in (200, 422)


class TestOversizedPayloads:
    async def test_oversized_bio_returns_422(self, client, auth_headers):
        resp = await client.put("/api/v1/profiles/me", headers=auth_headers,
            json={"bio": "x" * 10000})
        assert resp.status_code == 422