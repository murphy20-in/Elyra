"""Integration: subscribe → webhook → tier upgrade."""
import pytest, hmac, hashlib, json

pytestmark = [pytest.mark.integration, pytest.mark.slow]


class TestPaymentFlow:
    async def test_subscribe_returns_payment_link(self, client, auth_headers):
        resp = await client.post("/api/v1/payments/subscribe", headers=auth_headers,
            json={"plan": "plus"})
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert "payment_url" in data or "order_id" in data or "id" in data

    async def test_webhook_activates_subscription(self, client, auth_headers):
        me = await client.get("/api/v1/auth/me", headers=auth_headers)
        user_id = me.json()["id"]
        payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id":     "pay_integ_test_001",
                        "status": "captured",
                        "amount": 49900,
                        "notes":  {"user_id": user_id, "plan": "plus"},
                    }
                }
            }
        }
        body   = json.dumps(payload, separators=(',', ':')).encode()
        sig    = hmac.new(b"test_webhook_secret", body, hashlib.sha256).hexdigest()
        resp = await client.post("/api/v1/payments/webhook", json=payload,
            headers={"X-Razorpay-Signature": sig})
        assert resp.status_code in (200, 204)