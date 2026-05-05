#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost}"
PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL + 1)); }

echo ""
echo "═══════════════════════════════════════════"
echo "  Elyra Smoke Test"
echo "  Target: $BASE"
echo "═══════════════════════════════════════════"

echo ""
echo "[1] Health: liveness probe"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/health/live")
if [ "$STATUS" = "200" ]; then
    ok "GET /api/v1/health/live → 200"
else
    fail "GET /api/v1/health/live → $STATUS (expected 200)"
fi

echo ""
echo "[2] Health: readiness probe"
READY_RESP=$(curl -s "$BASE/api/v1/health/ready")
READY_STATUS=$(echo "$READY_RESP" | jq -r '.status' 2>/dev/null || echo "parse_error")
if [ "$READY_STATUS" = "ok" ]; then
    ok "GET /api/v1/health/ready → status=ok"
else
    fail "GET /api/v1/health/ready → status=$READY_STATUS (body: $READY_RESP)"
fi

echo ""
echo "[3] Auth: register new user"
TIMESTAMP=$(date +%s)
EMAIL="smoke_${TIMESTAMP}@test.elyra.app"
REGISTER_RESP=$(curl -s -X POST "$BASE/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$EMAIL\",
        \"password\": \"SmokeTest123!\",
        \"display_name\": \"Smoke\",
        \"age\": 25,
        \"gender_identity\": \"non-binary\",
        \"sexual_orientation\": \"pansexual\",
        \"intent\": \"exploring\",
        \"city\": \"Mumbai\"
    }")

ACCESS_TOKEN=$(echo "$REGISTER_RESP" | jq -r '.access_token' 2>/dev/null || echo "")
if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
    ok "POST /api/v1/auth/register → access_token received"
else
    fail "POST /api/v1/auth/register → no token (body: $REGISTER_RESP)"
    echo ""
    echo "Cannot continue without auth token."
    exit 1
fi

echo ""
echo "[4] Auth: fetch current user"
ME_RESP=$(curl -s "$BASE/api/v1/auth/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
ME_EMAIL=$(echo "$ME_RESP" | jq -r '.email' 2>/dev/null || echo "")
if [ "$ME_EMAIL" = "$EMAIL" ]; then
    ok "GET /api/v1/auth/me → email matches"
else
    fail "GET /api/v1/auth/me → email mismatch (got: $ME_EMAIL)"
fi

echo ""
echo "[5] Matching: discover candidates"
DISCOVER_RESP=$(curl -s "$BASE/api/v1/matches/discover" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
DISCOVER_OK=$(echo "$DISCOVER_RESP" | jq 'has("candidates") or has("items") or (. | type == "array")' 2>/dev/null || echo "false")
if [ "$DISCOVER_OK" = "true" ]; then
    ok "GET /api/v1/matches/discover → valid response shape"
else
    fail "GET /api/v1/matches/discover → unexpected shape (body: $DISCOVER_RESP)"
fi

echo ""
echo "[6] WebSocket: socket.io handshake"
POLL_RESP=$(curl -s "$BASE/socket.io/?EIO=4&transport=polling" 2>/dev/null || echo "")
if echo "$POLL_RESP" | grep -q '"sid"'; then
    ok "socket.io polling handshake → sid received"
else
    fail "socket.io polling handshake → unexpected response"
fi

echo ""
echo "═══════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
exit 0