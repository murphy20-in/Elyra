"""API tests for /api/v1/payments/* endpoints."""
import pytest
import hmac
import hashlib
import json

pytestmark = pytest.mark.api


class TestPlans:
    async def test_list_plans_public(self, client):
        resp = await client.get("/api/v1/payments/plans")
        assert resp.status_code == 200
        plans = resp.json()
        plan_names = [p["name"] for p in plans]
        assert "plus" in plan_names
        assert "premium" in plan_names

    async def test_each_plan_has_price(self, client):
        resp = await client.get("/api/v1/payments/plans")
        for plan in resp.json():
            assert "monthly_price" in plan or "price" in plan


class TestSubscription:
    async def test_get_current_subscription_free(self, client, auth_headers):
        resp = await client.get("/api/v1/payments/subscription", headers=auth_headers)
        assert resp.status_code == 200

    async def test_subscribe_to_plus(self, client, auth_headers):
        resp = await client.post("/api/v1/payments/subscribe", headers=auth_headers,
            json={"plan": "plus"})
        assert resp.status_code in (200, 201)


class TestRazorpayWebhook:
    def _make_signature(self, payload: dict, secret: str) -> str:
        body = json.dumps(payload, separators=(',', ':')).encode()
        sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        return sig

    async def test_webhook_valid_signature(self, client):
        payload = {
            "event":   "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id":      "pay_test123",
                        "status":  "captured",
                        "amount":  49900,
                        "notes":   {"user_id": "test-user-id", "plan": "plus"},
                    }
                }
            }
        }
        secret = "test_webhook_secret"
        sig = self._make_signature(payload, secret)
        resp = await client.post("/api/v1/payments/webhook", json=payload,
            headers={"X-Razorpay-Signature": sig})
        assert resp.status_code in (200, 204)

    async def test_webhook_invalid_signature_returns_400(self, client):
        payload = {"event": "payment.captured", "payload": {}}
        resp = await client.post("/api/v1/payments/webhook", json=payload,
            headers={"X-Razorpay-Signature": "invalid_sig"})
        assert resp.status_code in (400, 401)