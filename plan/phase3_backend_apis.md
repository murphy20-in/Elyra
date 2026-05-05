# Phase 3: Backend APIs (Service by Service)

> **Goal**: Implement all backend API routes, business logic services, Pydantic schemas, and FastAPI dependencies for every microservice module. Each service is built as a FastAPI router mounted on the main app.

---

## 3.1 API Design Principles

- **Versioned**: All routes under `/api/v1/`
- **RESTful**: Standard HTTP methods (GET, POST, PUT, PATCH, DELETE)
- **Async**: All handlers use `async def`
- **Validated**: Pydantic schemas for request/response
- **Authenticated**: JWT dependency injection on protected routes
- **Paginated**: List endpoints support `?page=1&per_page=20`
- **Error Handling**: Consistent error response format with HTTPException

### Standard Error Response
```python
{
    "detail": "Error message",
    "error_code": "VALIDATION_ERROR",
    "timestamp": "2025-01-01T00:00:00Z"
}
```

---

## 3.2 Auth Service (`routes/auth.py` + `services/auth_service.py`)

### Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | No | Create new user account |
| POST | `/api/v1/auth/login` | No | Login with email/password |
| POST | `/api/v1/auth/refresh` | Refresh Token | Refresh access token |
| POST | `/api/v1/auth/logout` | Yes | Invalidate refresh token |
| POST | `/api/v1/auth/forgot-password` | No | Send password reset email |
| POST | `/api/v1/auth/reset-password` | No | Reset password with token |
| GET | `/api/v1/auth/me` | Yes | Get current user info |
| POST | `/api/v1/auth/email/send-verification` | Yes | Email a 24h verification token |
| GET | `/api/v1/auth/email/verify?token=...` | No | Confirm email; sets `email_verified=True` |
| POST | `/api/v1/auth/phone/send-otp` | Yes | Send 6-digit OTP via Twilio (10min TTL, max 5 attempts) |
| POST | `/api/v1/auth/phone/verify-otp` | Yes | Verify OTP; sets `phone_verified=True` |
| POST | `/api/v1/auth/oauth/{provider}/login` | No | OAuth login (provider in {google, apple}) — token-exchange flow |
| POST | `/api/v1/auth/change-password` | Yes | Change password while logged in (requires old password) |

### Schemas (`schemas/auth.py`)
```python
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str               # min 8 chars, 1 upper, 1 number, 1 special
    display_name: str           # 2-100 chars
    age: int                    # 18-100
    gender_identity: str
    sexual_orientation: str
    intent: Literal['exploring','serious','discreet','friendship']

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class UserResponse(BaseModel):
    id: UUID
    email: str
    role: str
    is_verified: bool
    created_at: datetime
```

### Service Logic (`services/auth_service.py`)
1. **register()**: Validate unique email → hash password → INSERT user → INSERT empty `public_profile` (with display_name, age, gender, orientation, intent from request) → INSERT empty `user_preferences` (with sensible defaults from intent) → generate JWT pair → publish `user.registered` (fan-out: email verification email, initial embedding) → return `TokenResponse`. Wrap in DB transaction.
2. **login()**: Find user by email → check `is_banned`, `locked_until`, `deleted_at` → verify password → on failure increment `failed_login_count`, lock account for 15min after 5 failures → update `last_login` → generate tokens.
3. **refresh()**: Decode refresh token → check Redis blacklist `refresh_blacklist:{jti}` → generate new pair → blacklist old refresh (rotation).
4. **logout()**: Add the refresh token's `jti` to Redis blacklist with TTL = remaining lifetime.
5. **forgot_password()**: Generate `PasswordResetToken` (hash stored, raw mailed) → 1h TTL → email link `/reset-password?token=...`. Always return 200 (do not leak whether email exists).
6. **reset_password()**: Look up token by hash → enforce single-use (`used_at`) → set new password → invalidate all refresh tokens for that user.
7. **change_password()**: Authenticated; require old password → set new → invalidate all refresh tokens.
8. **send_email_verification()**: Generate token, store hash, email link.
9. **verify_email()**: Look up by hash, mark used, set `users.email_verified=True`.
10. **send_phone_otp()**: Generate 6-digit code, store hash with 10-min TTL, send via `twilio.messages.create(...)`.
11. **verify_phone_otp()**: Compare hash, increment `attempts` on failure (max 5), set `phone_verified=True`.
12. **oauth_login(provider, oauth_token)**: Verify token with provider's API → fetch profile → upsert user (link by email, generate random password placeholder if new) → return JWT pair.
13. **Token blacklisting**: `SET refresh_blacklist:{jti} 1 EX {remaining_ttl}` on logout / refresh rotation / password change.
14. **Password policy** (validated in Pydantic): min 8 chars, ≥1 upper, ≥1 lower, ≥1 digit, ≥1 special.
15. **Audit logging**: every register/login/logout/password change writes to `audit_logs`.

### Dependencies (`core/dependencies.py`)
```python
async def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)) -> User:
    """Decode JWT, fetch user from DB, return User object. Raise 401 if invalid."""

async def get_current_active_user(user = Depends(get_current_user)) -> User:
    """Check user is active and not banned. Raise 403 if not."""

def require_role(*roles: str):
    """Dependency factory: checks user role is in allowed roles."""
```

---

## 3.3 Profile Service (`routes/profile.py` + `services/profile_service.py`)

### Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/profiles/me` | Yes | Get own public + private profile |
| PUT | `/api/v1/profiles/me/public` | Yes | Update public profile |
| PUT | `/api/v1/profiles/me/private` | Yes | Update private profile |
| GET | `/api/v1/profiles/{user_id}` | Yes | View another user's public profile |
| POST | `/api/v1/profiles/me/photos` | Yes | Upload profile photo |
| DELETE | `/api/v1/profiles/me/photos/{index}` | Yes | Remove photo |
| PUT | `/api/v1/profiles/me/preferences` | Yes | Update user preferences |
| GET | `/api/v1/profiles/me/preferences` | Yes | Get user preferences |
| POST | `/api/v1/profiles/{user_id}/reveal` | Yes | Grant private profile access |
| DELETE | `/api/v1/profiles/{user_id}/reveal` | Yes | Revoke private profile access |
| GET | `/api/v1/profiles/{user_id}/private` | Yes | View revealed private profile |

### Schemas (`schemas/profile.py`)
```python
class PublicProfileUpdate(BaseModel):
    display_name: Optional[str]
    bio: Optional[str]
    city: Optional[str]
    state: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    intent: Optional[Literal['exploring','serious','discreet','friendship']]
    pronouns: Optional[str]
    is_visible: Optional[bool]

class PrivateProfileUpdate(BaseModel):
    real_name: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    id_document_url: Optional[str]

class PublicProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    display_name: str
    age: int
    gender_identity: str
    sexual_orientation: str
    pronouns: Optional[str]
    bio: Optional[str]
    city: Optional[str]
    intent: str
    profile_photo_url: Optional[str]
    photos: list[str]
    is_verified: bool   # from user.is_verified

class PreferenceUpdate(BaseModel):
    preferred_genders: Optional[list[str]]
    preferred_orientations: Optional[list[str]]
    age_min: Optional[int]
    age_max: Optional[int]
    max_distance_km: Optional[int]
    preferred_intents: Optional[list[str]]
```

### Service Logic
1. **get_own_profile()**: Fetch public_profile + private_profile (decrypted) + preferences in a single async transaction.
2. **update_public_profile()**: Validate → bio is sent to moderation service (`moderate/text` with `context="bio"`); if `action=="block"`, reject with 422 → update → publish `profile.updated` (triggers re-embedding).
3. **update_private_profile()**: Encrypt each field with AES-256-GCM (random nonce per field) → store ciphertext bytes; never store plaintext or log it.
4. **reveal_private(target_user_id)**: Append requester's user_id to `reveal_to` JSONB array. Write `audit_logs` entry. Notify target via `notification.created`.
5. **revoke_reveal(target_user_id)**: Remove from `reveal_to`.
6. **view_private(target_user_id)**: Check if requester is in `reveal_to`; if not → 403; else decrypt and return; write audit log.
7. **upload_photo()**:
   - Accept multipart file via `python-multipart`.
   - Validate: max size 5 MB (`MAX_PHOTO_SIZE_MB`), allowed types `image/jpeg|png|webp`.
   - Verify magic bytes (use `Pillow.Image.verify()` to reject corrupt/spoofed files).
   - Strip EXIF (location data leak).
   - Resize to ≤ 1600px on longest side, JPEG quality 85.
   - Compute SHA-256 hash → check against blocked-image hash store; reject duplicates.
   - Submit to image-service `/moderate/image`; if `action=="block"`, reject 422.
   - Upload to S3 (`s3://{S3_BUCKET}/profiles/{user_id}/{uuid}.jpg`), set `Cache-Control: public, max-age=31536000`.
   - Append CDN URL to `photos` JSONB; cap at 6 photos.
8. **delete_photo(index)**: Remove from JSONB; soft-delete in S3 (move to `deleted/` prefix; lifecycle policy purges after 30 days).
9. **set_primary_photo(index)**: Update `profile_photo_url`.
10. **update_preferences()**: Validate `age_min < age_max`, gender values in allowed enum → update → publish `preferences.updated` (triggers re-embedding).

---

## 3.4 Matching Service (`routes/match.py` + `services/matching_service.py`)

### Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/matches/discover` | Yes | Get match candidates (paginated) |
| POST | `/api/v1/matches/{user_id}/like` | Yes | Like a user |
| POST | `/api/v1/matches/{user_id}/pass` | Yes | Pass on a user |
| GET | `/api/v1/matches` | Yes | Get all matches |
| GET | `/api/v1/matches/{match_id}` | Yes | Get match details |
| DELETE | `/api/v1/matches/{match_id}` | Yes | Unmatch |

### Schemas (`schemas/match.py`)
```python
class MatchCandidate(BaseModel):
    user_id: UUID
    display_name: str
    age: int
    gender_identity: str
    bio: Optional[str]
    city: Optional[str]
    intent: str
    profile_photo_url: Optional[str]
    compatibility_score: float  # 0.0 - 1.0
    distance_km: Optional[float]

class MatchResponse(BaseModel):
    id: UUID
    other_user: PublicProfileResponse
    status: str
    match_score: Optional[float]
    matched_at: Optional[datetime]

class DiscoverResponse(BaseModel):
    candidates: list[MatchCandidate]
    page: int
    total_pages: int
```

### Matching Algorithm (`services/matching_service.py`)
```python
def compute_match_score(user, candidate, embedding_similarity: float) -> float:
    """
    Composite scoring:
      - intent_match:       0.30 weight (exact intent match = 1.0, partial = 0.5, none = 0.0)
      - embedding_similarity: 0.35 weight (cosine similarity from pgvector)
      - distance_score:     0.20 weight (inverse normalized distance)
      - preference_match:   0.15 weight (gender, orientation, age range match)
    """
```

### Discovery Pipeline
1. Fetch current user's preferences + embedding
2. Filter out: blocked users, already-liked/passed users, inactive profiles, invisible profiles
3. Apply preference filters: gender, orientation, age range, distance
4. Query pgvector for top-N similar embeddings: `SELECT * FROM user_embeddings ORDER BY embedding <=> $1 LIMIT 100`
5. Compute composite score for each candidate
6. Sort by score descending, paginate, return

---

## 3.5 Chat Service (`routes/chat.py` + `services/chat_service.py`)

### REST Routes (Thread Management)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/chat/threads` | Yes | List user's chat threads |
| GET | `/api/v1/chat/threads/{thread_id}` | Yes | Get thread details |
| GET | `/api/v1/chat/threads/{thread_id}/messages` | Yes | Get messages (paginated, from MongoDB) |
| POST | `/api/v1/chat/threads/{thread_id}/read` | Yes | Mark messages as read |
| PATCH | `/api/v1/chat/threads/{thread_id}` | Yes | Update thread (toggle anonymous) |

### WebSocket endpoints — see Phase 5

### Service Logic
1. **list_threads()**: Fetch ChatThread records for user → join with last message from MongoDB
2. **get_messages()**: Query MongoDB `messages` collection by thread_id, sorted by created_at DESC, paginated
3. **mark_read()**: Update `read_by` array in MongoDB messages
4. On match creation: automatically create a ChatThread

---

## 3.6 Trust & Safety Service (`routes/safety.py` + `services/trust_safety_service.py`)

### Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/safety/reports` | Yes | Submit a report |
| GET | `/api/v1/safety/reports` | Moderator | List reports (admin/mod) |
| PATCH | `/api/v1/safety/reports/{report_id}` | Moderator | Update report status |
| POST | `/api/v1/safety/blocks` | Yes | Block a user |
| DELETE | `/api/v1/safety/blocks/{user_id}` | Yes | Unblock a user |
| GET | `/api/v1/safety/blocks` | Yes | List blocked users |
| GET | `/api/v1/safety/risk-score/{user_id}` | Moderator | Get user risk score |
| POST | `/api/v1/safety/safe-sessions` | Yes | Start a Safe Date session |
| GET | `/api/v1/safety/safe-sessions/active` | Yes | Get current active session |
| GET | `/api/v1/safety/safe-sessions` | Yes | List session history |
| PATCH | `/api/v1/safety/safe-sessions/{id}/check-in` | Yes | Check-in (resets timer) |
| POST | `/api/v1/safety/safe-sessions/{id}/location` | Yes | Update live location (lat/lng) |
| POST | `/api/v1/safety/safe-sessions/{id}/end` | Yes | End session normally |
| POST | `/api/v1/safety/sos` | Yes | Trigger SOS — notify emergency contact + log SafetyEvent |

### Schemas (`schemas/safety.py`)
```python
class ReportCreate(BaseModel):
    reported_user_id: UUID
    reason: Literal['harassment','fake_profile','inappropriate_content','spam','threatening','other']
    description: Optional[str]
    evidence_urls: Optional[list[str]]

class BlockCreate(BaseModel):
    blocked_user_id: UUID

class RiskScoreResponse(BaseModel):
    user_id: UUID
    risk_score: float           # 0.0 (safe) - 1.0 (dangerous)
    report_count: int
    factors: list[str]

class SafeSessionCreate(BaseModel):
    match_id: Optional[UUID]
    emergency_contact_name: str
    emergency_contact_phone: str          # E.164 format, validated
    meeting_location: Optional[str]
    scheduled_at: datetime
    check_in_interval_min: int = 30       # 15, 30, or 60
    live_location_enabled: bool = False

class SafeSessionResponse(BaseModel):
    id: UUID
    status: str
    last_check_in: Optional[datetime]
    next_check_in_due: Optional[datetime]
    live_location_enabled: bool
    latitude: Optional[float]
    longitude: Optional[float]

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float

class SOSTrigger(BaseModel):
    safe_session_id: Optional[UUID]
    latitude: Optional[float]
    longitude: Optional[float]
    note: Optional[str]
```

### Risk Scoring Logic
```python
def calculate_risk_score(user_id: UUID) -> float:
    """
    Factors:
      - Number of reports (weighted by severity)
      - Report resolution rate (dismissed vs upheld)
      - Account age (newer = higher risk factor)
      - Chat toxicity history (from moderation service)
      - Verification status (verified = lower risk)
    Normalize to 0.0-1.0 range.
    Implementation details in Phase 4 §4.6.
    """
```

### Safe Date Service Logic (`services/safety_service.py`)
1. **create_safe_session()**: Validate user has no other active session → INSERT `SafeSession` (`status='active'`) → Celery task scheduled for `scheduled_at + check_in_interval_min` to detect missed check-ins → return session.
2. **check_in()**: Update `last_check_in=now()` → reschedule next missed-check-in Celery task.
3. **update_location()**: If `live_location_enabled=True` only; update `latitude`, `longitude` and publish `safety.location_updated` (broadcast to emergency contact's anonymous tracking link if implemented later).
4. **end_session()**: Set `status='completed'`, `ended_at=now()`. Cancel scheduled Celery task.
5. **trigger_sos()**: INSERT `SafetyEvent(event_type='sos_triggered')` → send SMS to emergency contact via Twilio with location (if available) → send push notification to user → optional: notify all blocked-user moderators via internal alert.
6. **missed_checkin_handler** (Celery task): If `now() - last_check_in > check_in_interval_min`, INSERT `SafetyEvent(event_type='check_in_missed')` → SMS emergency contact.
7. All safety endpoints write to `audit_logs`.

---

## 3.7 Payment Service (`routes/payment.py` + `services/payment_service.py`)

### Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/payments/plans` | Yes | List subscription plans |
| POST | `/api/v1/payments/subscribe` | Yes | Create subscription |
| GET | `/api/v1/payments/subscription` | Yes | Get current subscription |
| POST | `/api/v1/payments/cancel` | Yes | Cancel subscription |
| POST | `/api/v1/payments/webhook` | No (verified) | Payment gateway webhook |
| GET | `/api/v1/payments/history` | Yes | Payment history |
| POST | `/api/v1/payments/verify-badge` | Yes | Purchase verification badge |

### Schemas (`schemas/payment.py`)
```python
class SubscriptionPlan(BaseModel):
    tier: str
    name: str
    price_monthly: float
    price_yearly: float
    currency: str
    features: list[str]

class SubscribeRequest(BaseModel):
    tier: Literal['plus','premium','elite']
    billing_cycle: Literal['monthly','yearly']
    payment_method: str

class PaymentWebhook(BaseModel):
    gateway_txn_id: str
    status: str
    amount: float
    metadata: dict
```

### Subscription Tiers
| Tier | Monthly (INR) | Features |
|------|---------------|----------|
| Free | 0 | Basic matching, 5 likes/day, ads |
| Plus | 499 | Unlimited likes, see who liked you, no ads |
| Premium | 999 | Plus + advanced filters, priority matching, read receipts |
| Elite | 1999 | Premium + profile boost, incognito mode, priority support |

---

## 3.8 Notification Service (`routes/notification.py` + `services/notification_service.py`)

### Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/notifications` | Yes | List notifications (paginated) |
| PATCH | `/api/v1/notifications/{id}/read` | Yes | Mark as read |
| POST | `/api/v1/notifications/read-all` | Yes | Mark all as read |
| GET | `/api/v1/notifications/unread-count` | Yes | Get unread count |
| DELETE | `/api/v1/notifications/{id}` | Yes | Delete notification |
| POST | `/api/v1/notifications/devices` | Yes | Register a device push token |
| DELETE | `/api/v1/notifications/devices/{token_id}` | Yes | Unregister device token |
| GET | `/api/v1/notifications/preferences` | Yes | Get per-channel notification prefs |
| PUT | `/api/v1/notifications/preferences` | Yes | Update per-channel notification prefs |

### Service Logic
1. **create_notification()**: Called internally when events occur (`match.created`, `message.sent` to offline user, `safety_event`, `payment.completed`). Persists in `notifications`, then dispatches via push (FCM web/Android, APNs iOS) using all `is_active=True` device tokens for that user.
2. **Event listeners**: Subscribe to `elyra:events` Redis channel → fan-out to handlers (Phase 7 §7.4).
3. **register_device_token(token, platform)**: UPSERT into `device_tokens`. Tokens are deactivated when FCM/APNs reports them as invalid (`UNREGISTERED` error).
4. **Push provider abstraction** (`services/push_service.py`):
   - `send_fcm(tokens: list[str], title, body, data)` — uses `firebase-admin`.
   - `send_apns(tokens, title, body, data)` — uses `firebase-admin` (FCM HTTP v1 supports APNs proxy).
5. **Email channel**: For high-priority safety events (SOS, missed check-in) and weekly digest (premium users).
6. **Per-channel prefs** stored in a `notification_preferences` JSONB column on user (or in a flat sub-table `notification_preferences`). Toggles: `match`, `message`, `safety`, `payment`, `system`.

---

## 3.9 Health Check (`routes/health.py`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/health` | No | Basic health check |
| GET | `/api/v1/health/detailed` | Admin | DB, Redis, MongoDB connectivity |

---

## 3.10 Middleware Implementation (`core/middleware.py`)

### Middleware Stack (order matters)
1. **CORSMiddleware**: Allow configured origins
2. **RateLimitMiddleware**: Redis-backed rate limiting
3. **RequestLoggingMiddleware**: Log request/response metadata
4. **ErrorHandlingMiddleware**: Catch exceptions, return standard error format

### Rate Limiter Implementation
```python
class RateLimitMiddleware:
    """
    Redis-backed sliding window rate limiter.
    - Global: 100 req/min per IP
    - Auth endpoints: 10 req/min per IP (login, register, OTP send, password reset)
    - Authenticated: 60 req/min per user
    - WS message rate (Phase 5): 30 messages/min per user
    Uses Redis MULTI/EXEC with sorted sets ZADD/ZREMRANGEBYSCORE for sliding window.
    Returns 429 with Retry-After header when limit exceeded.
    """
```

### Additional Cross-Cutting Middleware
- **`SecurityHeadersMiddleware`** — adds `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security` (in prod), `Content-Security-Policy`.
- **`RequestIdMiddleware`** — assigns/propagates `X-Request-ID` for correlation in logs.
- **`MetricsMiddleware`** — Prometheus instrumentation (`prometheus-fastapi-instrumentator`).

---

## 3.11 Main Application Assembly (`main.py`)

```python
# File: app/backend/main.py

app = FastAPI(title="Elyra API", version="1.0.0")

# Middleware
app.add_middleware(CORSMiddleware, ...)
app.add_middleware(RateLimitMiddleware)

# Startup/shutdown events
@app.on_event("startup")  → connect to PostgreSQL, MongoDB, Redis
@app.on_event("shutdown")  → disconnect all

# Router includes
app.include_router(auth_router,         prefix="/api/v1/auth",          tags=["Auth"])
app.include_router(profile_router,      prefix="/api/v1/profiles",      tags=["Profiles"])
app.include_router(match_router,        prefix="/api/v1/matches",       tags=["Matches"])
app.include_router(chat_router,         prefix="/api/v1/chat",          tags=["Chat"])
app.include_router(safety_router,       prefix="/api/v1/safety",        tags=["Safety"])
app.include_router(payment_router,      prefix="/api/v1/payments",      tags=["Payments"])
app.include_router(notification_router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(health_router,       prefix="/api/v1/health",        tags=["Health"])
```

---

## 3.12 Phase 3 File Creation Checklist

| # | File | Contents |
|---|------|----------|
| 1 | `backend/schemas/auth.py` | Auth request/response schemas (incl. OTP, OAuth, change-password, password-strength validator) |
| 2 | `backend/schemas/profile.py` | Profile schemas (Public, Private, Photo upload response) |
| 3 | `backend/schemas/preference.py` | Preference schemas |
| 4 | `backend/schemas/match.py` | Match schemas |
| 5 | `backend/schemas/chat.py` | Chat thread + REST message schemas |
| 6 | `backend/schemas/safety.py` | Report, Block, RiskScore, SafeSession, SOS schemas |
| 7 | `backend/schemas/payment.py` | Subscription, payment, webhook schemas |
| 8 | `backend/schemas/notification.py` | Notification + DeviceToken + preferences schemas |
| 9 | `backend/routes/auth.py` | Auth router (13 endpoints incl. verification + OAuth) |
| 10 | `backend/routes/profile.py` | Profile router (11 endpoints) |
| 11 | `backend/routes/match.py` | Match router (6 endpoints) |
| 12 | `backend/routes/chat.py` | Chat REST router (5 endpoints) |
| 13 | `backend/routes/safety.py` | Safety router (14 endpoints incl. SafeSession + SOS) |
| 14 | `backend/routes/payment.py` | Payment router (7 endpoints) |
| 15 | `backend/routes/notification.py` | Notification router (9 endpoints) |
| 16 | `backend/routes/health.py` | Health check router (2 endpoints) |
| 17 | `backend/services/auth_service.py` | Auth business logic + OTP + OAuth |
| 18 | `backend/services/profile_service.py` | Profile CRUD + photo upload pipeline |
| 19 | `backend/services/matching_service.py` | Matching algorithm |
| 20 | `backend/services/chat_service.py` | Chat REST operations |
| 21 | `backend/services/trust_safety_service.py` | Reports, blocks, risk |
| 22 | `backend/services/safety_service.py` | Safe Date sessions + SOS dispatcher |
| 23 | `backend/services/payment_service.py` | Subscriptions + payments + Razorpay client |
| 24 | `backend/services/notification_service.py` | Notification dispatch + push provider |
| 25 | `backend/services/push_service.py` | FCM/APNs adapter |
| 26 | `backend/services/email_service.py` | Async SMTP send (verification, reset, digest) |
| 27 | `backend/services/sms_service.py` | Twilio wrapper for OTP + SOS |
| 28 | `backend/services/storage_service.py` | S3 upload + signed URL helpers |
| 29 | `backend/core/dependencies.py` | `get_current_user`, `require_role`, `require_verified_email`, `require_active_subscription` |
| 30 | `backend/core/middleware.py` | Rate limiting, CORS, security headers, request ID, metrics |
| 31 | `backend/core/events.py` | Redis pub/sub publisher (subscriber lives in Phase 7) |
| 32 | `backend/core/llm_client.py` | LLM provider abstraction (openai / local) |
| 33 | `backend/core/storage.py` | boto3 S3 client wrapper |
| 34 | `backend/core/logging.py` | structlog JSON config |
| 35 | `backend/core/metrics.py` | Prometheus instrumentator setup |
| 36 | `backend/workers/celery_app.py` | Celery factory (Redis broker + result backend) |
| 37 | `backend/workers/tasks.py` | re-embed, missed-checkin, subscription-expiry, risk-recompute |
| 38 | `backend/main.py` | FastAPI app assembly (complete) — middleware order, routers, lifespan |

---

*Phase 3 complete. Proceed to Phase 4: AI Modules.*
