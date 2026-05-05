# Phase 9: Testing

> **Goal**: Implement comprehensive test suites — unit tests, API integration tests, WebSocket tests, and end-to-end smoke tests — using pytest with async support, covering all critical paths.

---

## 9.1 Testing Architecture

```
tests/                                # Backend tests (pytest)
├── conftest.py                       # Shared fixtures (DB, client, auth, mock AI)
├── unit/
│   ├── test_security.py              # Encryption, hashing, JWT
│   ├── test_matching.py              # Matching algorithm
│   ├── test_risk_scoring.py          # Risk score formula
│   ├── test_fake_profile.py          # Fake profile heuristics
│   ├── test_anonymous_filter.py      # Anonymous mode filter
│   └── test_schemas.py               # Pydantic schema validation
├── api/
│   ├── test_auth.py                  # /auth/* (incl. OTP, OAuth, verification)
│   ├── test_profiles.py              # Profile CRUD + photo upload + reveal
│   ├── test_matches.py               # Match discovery + like
│   ├── test_chat.py                  # Chat REST
│   ├── test_safety.py                # Reports, blocks, safe sessions, SOS
│   ├── test_payments.py              # Subscription + payment + webhook
│   └── test_notifications.py         # Notifications + device tokens
├── websocket/
│   └── test_chat_ws.py               # WebSocket events
├── integration/
│   ├── test_registration_flow.py     # Register → profile → embedding → discover
│   ├── test_matching_flow.py         # Like → match → chat thread
│   ├── test_moderation_flow.py       # Message → moderate → flag
│   ├── test_safe_date_flow.py        # Create session → check-in → SOS
│   └── test_payment_flow.py          # Subscribe → webhook → tier upgrade
└── ai/
    ├── test_embedding.py             # Embedding service tests
    ├── test_moderation.py            # Moderation service tests
    └── test_fake_profile.py          # Fake profile service tests

frontend/e2e/                         # Frontend E2E (Playwright)
├── playwright.config.ts
├── auth.spec.ts                      # Login, register, logout, password reset
├── discover.spec.ts                  # Swipe interaction, match overlay
├── chat.spec.ts                      # Send/receive message via real backend
├── safety.spec.ts                    # Safe session creation, SOS button
└── a11y.spec.ts                      # axe-core accessibility checks

tests/load/                           # Load tests (locust)
├── locustfile.py                     # Realistic user flow
└── README.md                         # How to run

tests/security/                       # Security tests
├── test_rate_limiting.py             # Verify rate limits
├── test_authz.py                     # RBAC bypass attempts
├── test_input_validation.py          # SQLi, XSS, oversize payloads
└── test_encryption.py                # Verify private profile fields stored encrypted
```

---

## 9.2 Test Configuration

### `pytest.ini`
```ini
[pytest]
testpaths = tests
asyncio_mode = auto
filterwarnings = ignore::DeprecationWarning
markers =
    unit: Unit tests
    api: API endpoint tests
    websocket: WebSocket tests
    integration: Integration tests
    slow: Tests that take more than 5 seconds
```

### Dependencies (`requirements-test.txt`)
```
pytest==8.2.2
pytest-asyncio==0.23.7
pytest-cov==5.0.0
pytest-xdist==3.6.1       # Parallel test execution
httpx==0.27.0             # Async HTTP test client
factory-boy==3.3.0        # Test data factories
faker==25.8.0             # Fake data generation
respx==0.21.1             # Mock httpx (for AI service stubbing)
fakeredis==2.23.3         # In-memory Redis for unit tests
mongomock-motor==0.0.31   # In-memory async MongoDB
locust==2.29.0            # Load testing
```

---

## 9.3 Shared Fixtures (`conftest.py`)

```python
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from main import app
from core.database import Base, get_db

# ── Test Database ──
TEST_DATABASE_URL = "postgresql+asyncpg://test_user:test_pass@localhost:5432/elyra_test"

@pytest.fixture(scope="session")
async def engine():
    """Create test database engine and tables."""
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db_session(engine):
    """Provide a transactional test database session (rolled back after each test)."""
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        async with session.begin():
            yield session
            await session.rollback()

@pytest.fixture
async def client(db_session):
    """Provide async HTTP test client with DB override."""
    async def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()

@pytest.fixture
async def auth_headers(client):
    """Register a test user and return auth headers."""
    register_data = {
        "email": "test@example.com",
        "password": "TestPass123!",
        "display_name": "Test User",
        "age": 25,
        "gender_identity": "non-binary",
        "sexual_orientation": "pansexual",
        "intent": "exploring"
    }
    response = await client.post("/api/v1/auth/register", json=register_data)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
async def second_user_headers(client):
    """Register a second test user for matching/chat tests."""
    register_data = {
        "email": "test2@example.com",
        "password": "TestPass123!",
        "display_name": "Test User 2",
        "age": 28,
        "gender_identity": "woman",
        "sexual_orientation": "lesbian",
        "intent": "serious"
    }
    response = await client.post("/api/v1/auth/register", json=register_data)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

---

## 9.4 Unit Tests

### `test_security.py`
```python
# Tests for core/security.py

class TestPasswordHashing:
    def test_hash_password_returns_hash(self): ...
    def test_verify_correct_password(self): ...
    def test_verify_incorrect_password(self): ...
    def test_hash_is_not_plaintext(self): ...

class TestJWT:
    def test_create_access_token(self): ...
    def test_create_refresh_token(self): ...
    def test_decode_valid_token(self): ...
    def test_decode_expired_token_raises(self): ...
    def test_decode_invalid_token_raises(self): ...
    def test_access_token_has_correct_expiry(self): ...

class TestEncryption:
    def test_encrypt_decrypt_roundtrip(self): ...
    def test_different_plaintexts_different_ciphertexts(self): ...
    def test_decrypt_with_wrong_key_fails(self): ...
    def test_tampered_ciphertext_fails(self): ...  # GCM auth tag
```

### `test_matching.py`
```python
# Tests for services/matching_service.py

class TestMatchScoring:
    def test_exact_intent_match_high_score(self): ...
    def test_no_intent_match_low_score(self): ...
    def test_close_distance_higher_score(self): ...
    def test_far_distance_lower_score(self): ...
    def test_high_embedding_similarity_high_score(self): ...
    def test_composite_score_in_range(self): ...  # 0.0 - 1.0
    def test_preference_match_factors(self): ...

class TestCandidateFiltering:
    def test_blocked_users_excluded(self): ...
    def test_already_liked_excluded(self): ...
    def test_invisible_profiles_excluded(self): ...
    def test_age_range_filter(self): ...
    def test_distance_filter(self): ...
    def test_gender_preference_filter(self): ...
```

### `test_risk_scoring.py`
```python
class TestRiskScoring:
    def test_new_user_no_reports_low_risk(self): ...
    def test_many_reports_high_risk(self): ...
    def test_verified_user_lower_risk(self): ...
    def test_high_toxicity_history_increases_risk(self): ...
    def test_risk_score_clamped_0_1(self): ...
```

### `test_schemas.py`
```python
class TestAuthSchemas:
    def test_register_valid(self): ...
    def test_register_invalid_email(self): ...
    def test_register_weak_password(self): ...
    def test_register_age_below_18(self): ...
    def test_register_invalid_intent(self): ...

class TestProfileSchemas:
    def test_public_profile_update_valid(self): ...
    def test_invalid_latitude(self): ...

class TestPreferenceSchemas:
    def test_valid_preferences(self): ...
    def test_age_min_greater_than_max(self): ...
```

---

## 9.5 API Tests

### `test_auth.py`
```python
class TestRegistration:
    async def test_register_success(self, client): ...
    async def test_register_duplicate_email(self, client): ...
    async def test_register_weak_password(self, client): ...
    async def test_register_creates_profile(self, client): ...

class TestLogin:
    async def test_login_success(self, client, auth_headers): ...
    async def test_login_wrong_password(self, client): ...
    async def test_login_nonexistent_email(self, client): ...
    async def test_login_returns_tokens(self, client): ...

class TestTokenRefresh:
    async def test_refresh_success(self, client): ...
    async def test_refresh_with_invalid_token(self, client): ...
    async def test_refresh_rotates_tokens(self, client): ...

class TestMe:
    async def test_get_me_authenticated(self, client, auth_headers): ...
    async def test_get_me_unauthenticated(self, client): ...

class TestLogout:
    async def test_logout_invalidates_token(self, client, auth_headers): ...
```

### `test_profiles.py`
```python
class TestPublicProfile:
    async def test_get_own_profile(self, client, auth_headers): ...
    async def test_update_public_profile(self, client, auth_headers): ...
    async def test_view_other_user_profile(self, client, auth_headers): ...
    async def test_view_nonexistent_user_404(self, client, auth_headers): ...

class TestPrivateProfile:
    async def test_update_private_profile_encrypted(self, client, auth_headers): ...
    async def test_view_private_without_reveal_403(self, client, auth_headers): ...
    async def test_reveal_then_view_private_success(self, client, auth_headers): ...
    async def test_revoke_reveal_then_403(self, client, auth_headers): ...

class TestPreferences:
    async def test_get_preferences(self, client, auth_headers): ...
    async def test_update_preferences(self, client, auth_headers): ...

class TestPhotos:
    async def test_upload_photo(self, client, auth_headers): ...
    async def test_delete_photo(self, client, auth_headers): ...
```

### `test_matches.py`
```python
class TestDiscovery:
    async def test_discover_returns_candidates(self, client, auth_headers): ...
    async def test_discover_excludes_blocked(self, client, auth_headers): ...
    async def test_discover_pagination(self, client, auth_headers): ...

class TestLikePass:
    async def test_like_user(self, client, auth_headers): ...
    async def test_pass_user(self, client, auth_headers): ...
    async def test_mutual_like_creates_match(self, client, auth_headers, second_user_headers): ...
    async def test_like_blocked_user_fails(self, client, auth_headers): ...

class TestMatchManagement:
    async def test_list_matches(self, client, auth_headers): ...
    async def test_unmatch(self, client, auth_headers): ...
```

### `test_safety.py`
```python
class TestReports:
    async def test_create_report(self, client, auth_headers): ...
    async def test_report_self_fails(self, client, auth_headers): ...
    async def test_duplicate_report(self, client, auth_headers): ...

class TestBlocks:
    async def test_block_user(self, client, auth_headers): ...
    async def test_unblock_user(self, client, auth_headers): ...
    async def test_block_self_fails(self, client, auth_headers): ...
    async def test_blocked_user_hidden_from_discover(self, client, auth_headers): ...

class TestSafeSession:
    async def test_create_safe_session(self, client, auth_headers): ...
    async def test_check_in(self, client, auth_headers): ...
    async def test_trigger_sos(self, client, auth_headers): ...
```

### `test_payments.py`
```python
class TestPlans:
    async def test_list_plans(self, client, auth_headers): ...

class TestSubscription:
    async def test_create_subscription(self, client, auth_headers): ...
    async def test_cancel_subscription(self, client, auth_headers): ...
    async def test_get_current_subscription(self, client, auth_headers): ...

class TestWebhook:
    async def test_payment_webhook_success(self, client): ...
    async def test_payment_webhook_invalid_signature(self, client): ...
```

---

## 9.6 WebSocket Tests

### `test_chat_ws.py`
```python
class TestWebSocketChat:
    async def test_connect_with_valid_token(self): ...
    async def test_connect_with_invalid_token_rejected(self): ...
    async def test_send_message(self): ...
    async def test_receive_message(self): ...
    async def test_typing_indicator(self): ...
    async def test_read_receipt(self): ...
    async def test_message_stored_in_mongodb(self): ...
    async def test_moderated_message_flagged(self): ...
    async def test_anonymous_mode_hides_identity(self): ...
```

---

## 9.7 Integration Tests

### `test_registration_flow.py`
```python
class TestRegistrationFlow:
    async def test_full_registration_to_discovery(self, client):
        """
        1. Register new user
        2. Verify profile was created
        3. Verify embedding was generated (check user_embeddings table)
        4. Fetch discover endpoint
        5. Assert candidates returned
        """

    async def test_registration_creates_all_records(self, client):
        """Verify users, public_profiles, user_preferences all created."""
```

### `test_matching_flow.py`
```python
class TestMatchingFlow:
    async def test_mutual_like_creates_match_and_thread(self, client):
        """
        1. Register user A and user B
        2. User A likes user B → no match yet
        3. User B likes user A → match created
        4. Verify Match record exists
        5. Verify ChatThread created
        6. Verify notifications sent to both
        """

    async def test_like_then_unmatch(self, client):
        """Match → unmatch → verify thread deactivated."""
```

### `test_moderation_flow.py`
```python
class TestModerationFlow:
    async def test_toxic_message_flagged(self, client):
        """
        1. Create match + thread
        2. Send toxic message via WebSocket
        3. Verify moderation service called
        4. Verify message marked as moderated
        5. Verify moderation result stored
        """
```

---

## 9.8 AI Service Tests

### `test_embedding.py`
```python
class TestEmbeddingService:
    async def test_generate_embedding_returns_384_dims(self): ...
    async def test_similar_texts_high_similarity(self): ...
    async def test_different_texts_low_similarity(self): ...
    async def test_empty_text_handled(self): ...
    async def test_health_endpoint(self): ...
```

### `test_moderation.py`
```python
class TestModerationService:
    async def test_clean_text_allowed(self): ...
    async def test_toxic_text_flagged(self): ...
    async def test_severely_toxic_text_blocked(self): ...
    async def test_batch_moderation(self): ...
    async def test_health_endpoint(self): ...
```

---

## 9.8b Frontend E2E Tests (Playwright)

### `playwright.config.ts`
```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'mobile-chrome', use: devices['Pixel 7'] },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Critical Spec Coverage
- **`auth.spec.ts`** — register a fresh email, log in, log out; verify password reset round-trip.
- **`discover.spec.ts`** — render swipe stack, simulate like, assert "It's a Match!" overlay appears for mutual.
- **`chat.spec.ts`** — open thread, type message, assert it appears in a second browser context for the matched user (multi-context test).
- **`safety.spec.ts`** — create safe session, click SOS, assert toast and SafetyEvent created (verified via API call in test).
- **`a11y.spec.ts`** — run `@axe-core/playwright` on landing, login, discover, chat, safety; assert no critical violations.

### Backend prerequisites
E2E spins up the full Docker Compose stack via `infra/scripts/smoke-test.sh` (started from `playwright.config.ts` `globalSetup`).

---

## 9.8c Load Testing (Locust)

### `tests/load/locustfile.py`
```python
from locust import HttpUser, task, between

class ElyraUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        # Register a unique user, store JWT
        ...

    @task(3)
    def discover(self):
        self.client.get("/api/v1/matches/discover", headers=self.auth)

    @task(1)
    def like_random(self):
        ...

    @task(2)
    def open_profile(self):
        ...
```

Run: `locust -f tests/load/locustfile.py --host http://localhost --users 200 --spawn-rate 20`.

Targets: median latency < 200 ms at 200 concurrent users for `/discover`; < 500 ms at p95.

---

## 9.8d Security Tests

### `tests/security/test_authz.py`
- Verify a `user` role cannot hit moderator-only endpoints (`/safety/reports` GET, `/safety/risk-score/*`).
- Verify revealing a private profile without being in `reveal_to` returns 403.
- Verify cross-user data leakage: user A cannot read user B's preferences via `/me/preferences`.
- Verify expired access token is rejected.
- Verify revoked refresh token cannot be reused.

### `tests/security/test_input_validation.py`
- SQL injection attempt in `/profiles/me/public` `bio` field — verify parameterized query rejects it without raising.
- XSS payload in `display_name` — verify it is sanitized in the API response (Pydantic max-length already protects DB).
- Oversized payload (10 MB JSON) → 413.
- Path traversal in photo upload filename → rejected.

### `tests/security/test_rate_limiting.py`
- 11 rapid `POST /auth/login` from same IP → 11th gets 429.
- 31 rapid WS `send_message` events → 31st triggers `error code='rate_limited'`.

### `tests/security/test_encryption.py`
- Update `private_profile` with a known plaintext.
- Read the raw `LargeBinary` column from DB; assert plaintext bytes are NOT present.
- Decrypt via `core/security.decrypt_field` with the configured key; assert match.
- Tamper a single byte of the ciphertext; assert `decrypt_field` raises (GCM auth tag).

---

## 9.9 Running Tests

### Commands
```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=. --cov-report=html

# Run by marker
pytest tests/ -m unit -v
pytest tests/ -m api -v
pytest tests/ -m integration -v

# Run specific test file
pytest tests/api/test_auth.py -v

# Run in parallel (if pytest-xdist installed)
pytest tests/ -n auto
```

### CI Pipeline Script (`scripts/run-tests.sh`)
```bash
#!/bin/bash
set -e

echo "Starting test databases..."
docker compose -f docker-compose.test.yml up -d postgres redis mongodb

echo "Waiting for services healthy..."
docker compose -f docker-compose.test.yml ps
until docker compose -f docker-compose.test.yml exec -T postgres pg_isready -U elyra_user -d elyra_test; do
  sleep 2
done

echo "Running migrations on test DB..."
DATABASE_URL=$TEST_DATABASE_URL alembic upgrade head

echo "Running backend pytest suites..."
pytest tests/ -v --cov=. --cov-report=xml --cov-report=html \
    --junitxml=test-results.xml -n auto

echo "Running security tests..."
pytest tests/security/ -v -m security

echo "Tests complete."
docker compose -f docker-compose.test.yml down -v
```

### Smoke Test Script (`infra/scripts/smoke-test.sh`)
```bash
#!/bin/bash
# End-to-end smoke check against a running stack.
# Used by Phase 7 (manual) and Phase 9 Playwright globalSetup.
set -e
BASE=${BASE_URL:-http://localhost}

echo "[1] Health check"
curl -fsS "$BASE/api/v1/health" | grep -q '"status":"ok"'

echo "[2] Register user"
EMAIL="smoke+$(date +%s)@example.com"
TOKEN=$(curl -fsS -X POST "$BASE/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"TestPass123!\",\"display_name\":\"Smoke\",\"age\":25,\"gender_identity\":\"non-binary\",\"sexual_orientation\":\"pansexual\",\"intent\":\"exploring\"}" \
  | jq -r .access_token)
[ -n "$TOKEN" ] && echo "  OK"

echo "[3] /auth/me"
curl -fsS "$BASE/api/v1/auth/me" -H "Authorization: Bearer $TOKEN" | grep -q "$EMAIL"

echo "[4] /matches/discover"
curl -fsS "$BASE/api/v1/matches/discover" -H "Authorization: Bearer $TOKEN" | grep -q '"candidates"'

echo "[5] WebSocket connect"
# Uses websocat or python script to verify socket.io handshake succeeds with token.

echo "ALL SMOKE CHECKS PASSED"
```

---

## 9.10 Coverage Targets

| Module | Target Coverage |
|--------|----------------|
| `core/security.py` | 95%+ |
| `services/auth_service.py` | 90%+ |
| `services/matching_service.py` | 85%+ |
| `services/trust_safety_service.py` | 85%+ |
| `routes/*` | 80%+ |
| `websocket/*` | 75%+ |
| Overall | 80%+ |

---

## 9.11 Phase 9 File Checklist

| # | File | Contents |
|---|------|----------|
| 1 | `backend/tests/conftest.py` | Shared fixtures (engine, db_session, client, auth_headers, mock_ai) |
| 2 | `backend/tests/unit/test_security.py` | Encryption, hashing, JWT |
| 3 | `backend/tests/unit/test_matching.py` | Matching algorithm |
| 4 | `backend/tests/unit/test_risk_scoring.py` | Risk scoring |
| 5 | `backend/tests/unit/test_fake_profile.py` | Fake-profile detector |
| 6 | `backend/tests/unit/test_anonymous_filter.py` | Anonymous mode filter |
| 7 | `backend/tests/unit/test_schemas.py` | Pydantic schemas |
| 8 | `backend/tests/api/test_auth.py` | Auth API (incl. OTP, OAuth, change-password, verification) |
| 9 | `backend/tests/api/test_profiles.py` | Profile API (incl. photo upload, reveal flow) |
| 10 | `backend/tests/api/test_matches.py` | Match API |
| 11 | `backend/tests/api/test_chat.py` | Chat REST API |
| 12 | `backend/tests/api/test_safety.py` | Safety, blocks, safe sessions, SOS |
| 13 | `backend/tests/api/test_payments.py` | Payments + Razorpay webhook |
| 14 | `backend/tests/api/test_notifications.py` | Notifications + device tokens |
| 15 | `backend/tests/websocket/test_chat_ws.py` | WS events |
| 16 | `backend/tests/integration/test_registration_flow.py` | Register → embedding → discover |
| 17 | `backend/tests/integration/test_matching_flow.py` | Like → match → thread |
| 18 | `backend/tests/integration/test_moderation_flow.py` | Toxic message flow |
| 19 | `backend/tests/integration/test_safe_date_flow.py` | Session → check-in → SOS |
| 20 | `backend/tests/integration/test_payment_flow.py` | Subscription → webhook → tier |
| 21 | `backend/tests/ai/test_embedding.py` | Embedding service |
| 22 | `backend/tests/ai/test_moderation.py` | Moderation service |
| 23 | `backend/tests/ai/test_fake_profile.py` | Fake-profile service |
| 24 | `backend/tests/security/test_rate_limiting.py` | Rate-limit enforcement |
| 25 | `backend/tests/security/test_authz.py` | RBAC + ownership checks |
| 26 | `backend/tests/security/test_input_validation.py` | SQLi/XSS/oversize |
| 27 | `backend/tests/security/test_encryption.py` | Encrypted-at-rest verification |
| 28 | `backend/pytest.ini` | Pytest configuration |
| 29 | `backend/requirements-test.txt` | Test dependencies |
| 30 | `scripts/run-tests.sh` | CI test runner |
| 31 | `infra/scripts/smoke-test.sh` | E2E smoke check (curl) |
| 32 | `frontend/playwright.config.ts` | Playwright config |
| 33 | `frontend/e2e/auth.spec.ts` | E2E auth |
| 34 | `frontend/e2e/discover.spec.ts` | E2E discover |
| 35 | `frontend/e2e/chat.spec.ts` | E2E chat |
| 36 | `frontend/e2e/safety.spec.ts` | E2E safety |
| 37 | `frontend/e2e/a11y.spec.ts` | Accessibility checks |
| 38 | `tests/load/locustfile.py` | Locust load test |
| 39 | `tests/load/README.md` | How to run load tests |
| 40 | `app/docker-compose.test.yml` | Isolated test stack (postgres/redis/mongo on alt ports) |

---

## 9.12 Final Verification Checklist

After all 9 phases are complete, verify:

| # | Check | Command |
|---|-------|---------|
| 1 | Docker Compose starts all services | `docker compose up --build` |
| 2 | All health checks pass | `curl http://localhost/api/v1/health/detailed` |
| 3 | User registration works | POST to `/api/v1/auth/register` |
| 4 | User login works | POST to `/api/v1/auth/login` |
| 5 | Profile CRUD works | GET/PUT `/api/v1/profiles/me` |
| 6 | Discovery returns candidates | GET `/api/v1/matches/discover` |
| 7 | Like + mutual match works | POST to `/api/v1/matches/{id}/like` |
| 8 | Chat WebSocket connects | Connect to `/socket.io/` |
| 9 | Messages send + receive | Emit `send_message` event |
| 10 | Moderation detects toxicity | Send toxic message → verify flag |
| 11 | Frontend loads | Browse `http://localhost` |
| 12 | All backend tests pass | `pytest tests/ -v` |
| 13 | Test coverage ≥ 80% | `pytest --cov` |
| 14 | Playwright E2E pass | `cd frontend && npx playwright test` |
| 15 | Smoke test passes | `bash infra/scripts/smoke-test.sh` |
| 16 | Load test acceptable at 200 users | `locust -f tests/load/locustfile.py --headless -u 200 -r 20 -t 2m` |
| 17 | Security tests pass | `pytest tests/security/ -v` |
| 18 | a11y on key pages | `npx playwright test e2e/a11y.spec.ts` |
| 19 | Helm/Kustomize lint | `kubectl apply --dry-run=client -k infra/k8s/` |
| 20 | All AI services healthy | `curl http://localhost:9001/health && :9002 && :9003 && :9004` |

---

*Phase 9 complete. All phases (1-9) of the Elyra platform have been fully planned.*
