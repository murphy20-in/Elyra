# Elyra Codebase — Per-Phase Audit Prompts

> **How to use**: Each section below is a self-contained audit prompt for one phase. Feed it to your LLM (or Claude) together with the relevant files from the codebase. Work phase by phase, fixing issues before moving on.
>
> **Codebase root**: `/home/kaarthikeya/Elyra-main/codebase/app`
>
> **Convention**: All file paths below are relative to the codebase root.

---

## Global Rules (apply to every phase)

Before running any per-phase audit, confirm these invariants hold across the entire codebase:

1. **No sync DB calls** — every SQLAlchemy, Motor, and Redis call must use `async/await`. Flag any `session.execute(...)` without `await`.
2. **No metadata attribute clash** — `SafetyEvent` in `backend/models/safety.py` MUST use Python attribute name `event_metadata` with `Column("metadata", JSONB, ...)`. If it uses `metadata` as the attribute name, that is a critical bug.
3. **Matching score weights** — `intent_match(0.30) + embedding_similarity(0.35) + distance_score(0.20) + preference_match(0.15)` must equal exactly `1.0`. Fail the audit if the values differ.
4. **PII in logs** — Search every log call (`logger.info`, `logger.debug`, `structlog.get_logger()`) for `email`, `phone`, `real_name`, `password`. These must never appear unmasked.
5. **AES nonce** — `encrypt_field()` in `core/security.py` must generate a fresh `os.urandom(12)` nonce on every call and prepend it to the ciphertext bytes. A static or reused nonce is a critical security bug.
6. **Token rotation** — In `auth_service.refresh()`, the old refresh token JTI must be blacklisted in Redis **before** new tokens are returned, not after.
7. **Matching score weights** — `intent_match(0.30) + embedding_similarity(0.35) + distance_score(0.20) + preference_match(0.15)` = 1.0 exactly.

---

## Phase 1 Audit — Architecture & Scaffold

### Context
You are auditing the scaffold and architecture layer of the Elyra codebase. Elyra is a privacy-first LGBTQIA+ dating platform for India built as a Next.js 14 + FastAPI monorepo. This phase covers the top-level config files, dependency manifests, and directory structure.

### Files to read
```
app/README.md
app/.gitignore
app/.dockerignore
app/.env.example
app/backend/requirements.txt
app/backend/requirements-test.txt
app/backend/core/config.py
app/backend/main.py
app/frontend/package.json
app/frontend/tailwind.config.ts
app/frontend/next.config.js
app/mobile/package.json
app/mobile/app.json
app/mobile/App.tsx
app/mobile/README.md
app/infra/nginx/nginx.conf
app/docker-compose.yml
```

Also run:
```bash
find /home/kaarthikeya/Elyra-main/codebase/app -name "__init__.py" | sort
```

### Checklist

#### `.env.example`
Verify ALL of the following variable groups are present. Missing groups = fail.
- [ ] App: `APP_NAME`, `APP_ENV`, `APP_VERSION`, `SECRET_KEY`, `DEBUG`, `LOG_LEVEL`
- [ ] PostgreSQL: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `TEST_DATABASE_URL`
- [ ] Redis: `REDIS_HOST`, `REDIS_PORT`, `REDIS_URL`
- [ ] MongoDB: `MONGO_HOST`, `MONGO_PORT`, `MONGO_DB`, `MONGO_URL`
- [ ] JWT: `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`
- [ ] Encryption: `AES_ENCRYPTION_KEY` (32-byte hex)
- [ ] AI Services: `EMBEDDING_SERVICE_URL`, `MODERATION_SERVICE_URL`, `IMAGE_SERVICE_URL`, `FAKE_PROFILE_SERVICE_URL`
- [ ] LLM: `LLM_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `LOCAL_LLM_URL`
- [ ] CORS: `CORS_ORIGINS`
- [ ] Rate Limiting: `RATE_LIMIT_PER_MINUTE`, `AUTH_RATE_LIMIT_PER_MINUTE`, `WS_MESSAGE_RATE_LIMIT`
- [ ] Storage: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`, `MAX_PHOTO_SIZE_MB`
- [ ] Email/SMS: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `TWILIO_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
- [ ] Push: `FCM_SERVER_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`
- [ ] Payment: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- [ ] Observability: `SENTRY_DSN`, `PROMETHEUS_ENABLED`

#### `backend/core/config.py`
- [ ] Uses `pydantic-settings` `BaseSettings` class (not plain dataclass or dict)
- [ ] Every variable from `.env.example` has a corresponding field with correct type
- [ ] `DATABASE_URL` and `TEST_DATABASE_URL` use `postgresql+asyncpg://` scheme — NOT `postgresql://`
- [ ] `CORS_ORIGINS` is a `str` field (comma-separated), split only at usage point
- [ ] `AES_ENCRYPTION_KEY` is typed as `str` with a validator or documented 32-byte requirement
- [ ] `model_config = SettingsConfigDict(env_file=".env", extra="ignore")` or equivalent

#### `backend/requirements.txt`
Verify each of these packages is listed (exact pinning optional but recommended):
- [ ] `fastapi`, `uvicorn[standard]`, `python-multipart`
- [ ] `sqlalchemy[asyncio]`, `asyncpg`, `alembic`, `pgvector`
- [ ] `motor`, `redis`
- [ ] `pydantic`, `pydantic-settings`, `email-validator`
- [ ] `python-jose[cryptography]`, `passlib[bcrypt]`, `cryptography`
- [ ] `celery`, `celery[redis]`
- [ ] `httpx`, `python-socketio`
- [ ] `boto3`, `pillow`
- [ ] `structlog`, `prometheus-fastapi-instrumentator`, `sentry-sdk[fastapi]`
- [ ] `aiosmtplib`, `twilio`, `firebase-admin`, `razorpay`

#### `backend/main.py`
- [ ] `FastAPI()` app is created with `title`, `version`
- [ ] All 8 routers are mounted: auth, profiles, matches, chat, safety, payments, notifications, health
- [ ] socket.io ASGI app wraps FastAPI (`socketio.ASGIApp(sio, other_app=fastapi_app)`)
- [ ] `startup` and `shutdown` lifespan events are defined (or `lifespan` context manager)
- [ ] Middleware stack includes: CORSMiddleware, RateLimitMiddleware, SecurityHeadersMiddleware

#### `frontend/package.json`
Dependencies must include:
- [ ] `next` (v14.x), `react`, `react-dom`
- [ ] `tailwindcss`, `zustand`, `axios`, `socket.io-client`
- [ ] `framer-motion`, `@heroicons/react`, `lucide-react`
- [ ] `react-hot-toast`, `date-fns`, `next-intl`
- [ ] `@sentry/nextjs`, `next-pwa`
- [ ] `react-leaflet`, `leaflet`

DevDependencies must include:
- [ ] `typescript`, `@types/node`, `@types/react`, `@playwright/test`
- [ ] `eslint`, `eslint-config-next`

#### `frontend/tailwind.config.ts`
- [ ] Custom `primary` color: `#7C3AED`
- [ ] Custom `secondary` color: `#EC4899`
- [ ] Custom `accent` color: `#06B6D4`
- [ ] Dark mode configured (`darkMode: 'class'` or `'media'`)
- [ ] Custom animations defined: `pulse-slow`, `slide-up`, `fade-in`, `swipe-left`, `swipe-right`

#### `frontend/next.config.js`
- [ ] API rewrites: `/api/:path*` → `http://localhost:8000/api/:path*`
- [ ] Socket.io rewrite: `/socket.io/:path*` → `http://localhost:8000/socket.io/:path*`
- [ ] `next-pwa` wraps the config object (production only: `disable: process.env.NODE_ENV === 'development'`)
- [ ] Sentry plugin applied via `withSentryConfig`

#### `__init__.py` files
- [ ] Every directory under `backend/` that contains Python files has a `__init__.py`
- [ ] Every directory under `ai-services/*/` has a `__init__.py`
- [ ] Running `python -c "from main import app"` from `backend/` must not raise `ImportError`

#### `mobile/`
- [ ] `README.md` explicitly states "scaffold only — not feature-complete"
- [ ] `App.tsx` has `NavigationContainer` with auth-conditional stack routing
- [ ] `package.json` lists `expo`, `react-native`, `@react-navigation/native`, `react-native-mmkv`

### Fixes to apply if failing
1. Add any missing `.env.example` variables with placeholder values
2. Add missing `pydantic-settings` fields to `config.py` — match exact names from `.env.example`
3. Add missing npm/pip packages to dependency files
4. Add missing `__init__.py` files with `touch` command
5. If `next.config.js` is missing rewrites, add them in the `async rewrites()` export

---

## Phase 2 Audit — Database Models & Migrations

### Context
You are auditing the SQLAlchemy models, Alembic migration setup, MongoDB schema, and database connection utilities. This is the data layer — bugs here cascade to every other phase.

### Files to read
```
backend/models/__init__.py
backend/models/base.py
backend/models/user.py
backend/models/profile.py
backend/models/preference.py
backend/models/match.py
backend/models/chat.py
backend/models/chat_message.py
backend/models/safety.py
backend/models/embedding.py
backend/models/subscription.py
backend/models/payment.py
backend/models/notification.py
backend/models/safe_session.py
backend/models/verification.py
backend/models/audit.py
backend/core/database.py
backend/core/mongodb.py
backend/core/redis_client.py
backend/core/security.py
backend/alembic.ini
backend/alembic/env.py
backend/alembic/versions/  (list all files)
infra/scripts/init-db.sh
```

### Checklist

#### `models/base.py`
- [ ] `Base` inherits from `DeclarativeBase` (SQLAlchemy 2.0 style) — NOT `declarative_base()`
- [ ] `TimestampMixin` has `created_at` and `updated_at` as `Column(DateTime(timezone=True), ...)`

#### `models/user.py` — `User`
- [ ] Primary key: `UUID(as_uuid=True)`, default `uuid4`
- [ ] `email`: `String(255)`, `unique=True`, `nullable=False`, `index=True`
- [ ] `phone`: `String(20)`, `unique=True`, `nullable=True`
- [ ] `role`: `Enum('user','premium_user','verified_user','moderator','admin', name='user_role')`, default `'user'`
- [ ] `is_active`, `is_verified`, `email_verified`, `phone_verified`, `is_banned`: all `Boolean`
- [ ] `failed_login_count`: `Integer`, default `0`
- [ ] `locked_until`: `DateTime(timezone=True)`, nullable
- [ ] `last_login`, `last_seen`: `DateTime(timezone=True)`, nullable
- [ ] `deleted_at`: `DateTime(timezone=True)`, nullable (soft delete)

#### `models/profile.py` — `PublicProfile`
- [ ] `user_id`: FK to `users.id`, `ondelete="CASCADE"`, `unique=True`
- [ ] `gender_identity`, `sexual_orientation`: `String(50)`, nullable=False
- [ ] `photos`: `JSONB`, default `[]`
- [ ] `intent`: `Enum('exploring','serious','discreet','friendship')`, nullable=False
- [ ] `latitude`, `longitude`: `Float`, nullable=True

#### `models/profile.py` — `PrivateProfile`
- [ ] `real_name_enc`, `phone_enc`, `address_enc`, `id_document_enc`: ALL `LargeBinary`, nullable=True
- [ ] `reveal_to`: `JSONB`, default `[]`

#### `models/match.py` — `Match`
- [ ] `UniqueConstraint('user_id_1', 'user_id_2', name='uq_match_pair')` in `__table_args__`
- [ ] `CheckConstraint('user_id_1 < user_id_2', name='ck_ordered_pair')` in `__table_args__`
- [ ] `status`: `Enum('pending','matched','unmatched','expired')`
- [ ] `liked_by_1`, `liked_by_2`: `Boolean`, default `False`
- [ ] `match_score`: `Float`, nullable=True

#### `models/safety.py` — `SafetyEvent` ⚠️ CRITICAL
- [ ] Python attribute name is **`event_metadata`** (NOT `metadata`)
- [ ] Column is declared as `Column("metadata", JSONB, default={})` — the SQL column name is `"metadata"` but Python attr is `event_metadata`
- [ ] If `metadata` is used as the Python attribute anywhere, this is a **critical bug** — fix immediately

#### `models/embedding.py` — `UserEmbedding`
- [ ] `from pgvector.sqlalchemy import Vector` is imported
- [ ] `embedding = Column(Vector(384))` — dimension must be exactly 384
- [ ] `user_id`: FK `ondelete="CASCADE"`, `unique=True`

#### `models/notification.py` — `DeviceToken`
- [ ] `platform`: `Enum('ios','android','web', name='device_platform')`
- [ ] `token`: `String(500)`, `unique=True`

#### `models/chat_message.py`
- [ ] Is a **Pydantic model** (not SQLAlchemy) since messages are stored in MongoDB
- [ ] Fields: `thread_id`, `sender_id`, `content`, `message_type`, `is_moderated`, `moderation_result` (dict), `is_deleted`, `read_by` (list), `metadata`, `created_at`, `updated_at`
- [ ] Includes `client_message_id` field for idempotency

#### `models/__init__.py`
- [ ] Imports ALL model classes so Alembic autogenerate detects them

#### `core/database.py`
- [ ] Uses `create_async_engine` with `asyncpg` driver
- [ ] `async_sessionmaker` with `class_=AsyncSession`, `expire_on_commit=False`
- [ ] `get_db()` is an `async def` generator using `async with session_factory() as session: yield session`
- [ ] No synchronous `engine.connect()` or `Session()` anywhere

#### `core/security.py`
- [ ] `encrypt_field(plaintext, key)`: generates `os.urandom(12)` nonce on **every** call, uses AES-256-GCM, returns `nonce + ciphertext + tag` as bytes
- [ ] `decrypt_field(encrypted, key)`: splits the bytes into nonce (first 12), ciphertext (middle), tag (last 16), verifies GCM tag
- [ ] `hash_password()` uses `CryptContext(schemes=["bcrypt"])`
- [ ] `create_access_token()` accepts `data: dict`, sets `exp` to `datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)`
- [ ] `decode_token()` raises `JWTError` (not returns None) on expired/invalid tokens

#### `alembic/env.py`
- [ ] Imports ALL models: User, PublicProfile, PrivateProfile, UserPreference, Match, ChatThread, SafetyEvent, Report, Block, UserEmbedding, Subscription, Payment, Notification, DeviceToken, SafeSession, EmailVerification, PhoneVerification, PasswordResetToken, AuditLog
- [ ] `target_metadata = Base.metadata`
- [ ] `config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)`
- [ ] Uses `async_engine_from_config` for online migration (async-aware)

#### `alembic/versions/*initial_schema*.py`
- [ ] Contains `op.execute(...)` that creates the HNSW index:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_user_embeddings_hnsw
  ON user_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m=16, ef_construction=64);
  ```
- [ ] `downgrade()` function drops that index before dropping the table

#### `infra/scripts/init-db.sh`
- [ ] `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
- [ ] `CREATE EXTENSION IF NOT EXISTS vector;`
- [ ] Creates `elyra_test` database
- [ ] Enables both extensions on `elyra_test`

### Fixes to apply if failing
1. Rename `SafetyEvent.metadata` → `event_metadata` with `Column("metadata", JSONB)` everywhere it's referenced
2. If `Base` uses old-style `declarative_base()`, migrate to `DeclarativeBase`
3. Add `client_message_id` field to `chat_message.py` Pydantic model
4. If HNSW index is missing from the migration, add `op.execute(...)` manually to the initial migration file
5. If `encrypt_field` uses a static nonce, fix to `os.urandom(12)` — this is a security-critical fix

---

## Phase 3 Audit — Backend APIs

### Context
You are auditing all FastAPI routes, Pydantic schemas, service layer business logic, and core middleware. This is the largest phase — work through each service module systematically.

### Files to read
```
backend/schemas/auth.py
backend/schemas/profile.py
backend/schemas/preference.py
backend/schemas/match.py
backend/schemas/chat.py
backend/schemas/safety.py
backend/schemas/payment.py
backend/schemas/notification.py
backend/routes/auth.py
backend/routes/profile.py
backend/routes/match.py
backend/routes/chat.py
backend/routes/safety.py
backend/routes/payment.py
backend/routes/notification.py
backend/routes/health.py
backend/services/auth_service.py
backend/services/profile_service.py
backend/services/matching_service.py
backend/services/chat_service.py
backend/services/trust_safety_service.py
backend/services/safety_service.py
backend/services/payment_service.py
backend/services/notification_service.py
backend/services/push_service.py
backend/services/email_service.py
backend/services/sms_service.py
backend/services/storage_service.py
backend/core/dependencies.py
backend/core/middleware.py
backend/core/events.py
backend/workers/celery_app.py
backend/workers/tasks.py
```

### Checklist

#### Schemas

**`schemas/auth.py`**
- [ ] `RegisterRequest` has a Pydantic `@field_validator` for `password` checking: min 8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special character
- [ ] `RegisterRequest` has `age: int` with `ge=18` constraint
- [ ] `TokenResponse` has `access_token`, `refresh_token`, `token_type`, `expires_in`
- [ ] `OAuthLoginRequest` exists with `provider` and `oauth_token` fields
- [ ] `ChangePasswordRequest` has `old_password` and `new_password` fields

**`schemas/safety.py`**
- [ ] `SafeSessionCreate.emergency_contact_phone` validates E.164 format (starts with `+`, digits only)
- [ ] `SafeSessionCreate.check_in_interval_min` is `Literal[15, 30, 60]` or `int` with validator
- [ ] `SOSTrigger` has `safe_session_id: Optional[UUID]`, `latitude: Optional[float]`, `longitude: Optional[float]`, `note: Optional[str]`

**`schemas/match.py`**
- [ ] `MatchCandidate` has `compatibility_score: float` and `distance_km: Optional[float]`
- [ ] `DiscoverResponse` has `candidates: list[MatchCandidate]`, `page: int`, `total_pages: int`

#### Routes — endpoint count verification

| Router | Required endpoints | Check |
|--------|-------------------|-------|
| `auth.py` | 13 | [ ] |
| `profile.py` | 11 | [ ] |
| `match.py` | 6 | [ ] |
| `chat.py` | 5 REST | [ ] |
| `safety.py` | 14 | [ ] |
| `payment.py` | 7 | [ ] |
| `notification.py` | 9 | [ ] |
| `health.py` | 3 (`/health`, `/health/detailed`, `/health/ready`) | [ ] |

**`routes/auth.py` — specific endpoints**
- [ ] `POST /register`
- [ ] `POST /login`
- [ ] `POST /refresh`
- [ ] `POST /logout`
- [ ] `POST /forgot-password`
- [ ] `POST /reset-password`
- [ ] `GET /me`
- [ ] `POST /email/send-verification`
- [ ] `GET /email/verify`
- [ ] `POST /phone/send-otp`
- [ ] `POST /phone/verify-otp`
- [ ] `POST /oauth/{provider}/login`
- [ ] `POST /change-password`

**`routes/health.py`**
- [ ] `GET /health` — no auth, always returns 200 while process is up
- [ ] `GET /health/detailed` — admin auth required, checks all services
- [ ] `GET /health/ready` — K8s readiness probe, returns 503 if PG/Redis unreachable

#### Services

**`services/auth_service.py`**
- [ ] `register()` creates `User`, `PublicProfile`, `UserPreference` in a single DB transaction
- [ ] `register()` publishes `user.registered` event after commit
- [ ] `login()` checks `is_banned`, `locked_until`, `deleted_at` before password verification
- [ ] `login()` increments `failed_login_count`; after 5 failures sets `locked_until = now() + 15min`
- [ ] `refresh()` checks Redis key `refresh_blacklist:{jti}` before issuing new tokens
- [ ] `refresh()` blacklists old JTI **before** returning new tokens
- [ ] `logout()` sets `SET refresh_blacklist:{jti} 1 EX {remaining_ttl}` in Redis
- [ ] `forgot_password()` always returns HTTP 200 regardless of whether email exists (no email enumeration)
- [ ] `reset_password()` checks `used_at` is None (single-use token enforcement)
- [ ] `change_password()` invalidates all refresh tokens for the user after password change
- [ ] Every auth action writes a row to `audit_logs`

**`services/profile_service.py`**
- [ ] `update_public_profile()` calls moderation service for bio text before saving
- [ ] `update_public_profile()` returns HTTP 422 if moderation `action == "block"`
- [ ] `update_private_profile()` AES-256-GCM encrypts each field using `core/security.encrypt_field()`
- [ ] `update_private_profile()` never logs plaintext values
- [ ] `upload_photo()` validates MIME type using Pillow `Image.verify()` (magic bytes), not just file extension
- [ ] `upload_photo()` strips EXIF data before processing
- [ ] `upload_photo()` resizes to ≤1600px on the longest side
- [ ] `upload_photo()` calls image service for moderation before S3 upload
- [ ] `upload_photo()` caps at 6 photos per user
- [ ] `reveal_private()` appends user_id to `reveal_to` JSONB and writes audit log
- [ ] `view_private()` checks requester is in `reveal_to` array, raises 403 if not, writes audit log

**`services/matching_service.py`**
- [ ] Composite score formula: `intent(0.30) + embedding(0.35) + distance(0.20) + preference(0.15)` = **1.0 exactly**
- [ ] Discovery pipeline filters out: blocked users, already-liked/passed users, inactive profiles, invisible profiles
- [ ] pgvector query uses `ORDER BY embedding <=> $1 LIMIT N` syntax

**`services/trust_safety_service.py`**
- [ ] `calculate_risk_score()` uses weights: `report_count(0.30) + upheld_ratio(0.25) + toxicity_avg(0.20) + account_age(0.10) + verification(0.15)` = 1.0
- [ ] Result clamped to `[0.0, 1.0]`

**`services/safety_service.py`**
- [ ] `create_safe_session()` verifies no other `status='active'` session exists for user
- [ ] `trigger_sos()` creates `SafetyEvent`, sends SMS via Twilio, sends push notification
- [ ] `missed_checkin_handler()` is a Celery task that sends SMS to emergency contact

**`core/middleware.py`**
- [ ] `RateLimitMiddleware` uses Redis sliding window (ZADD/ZREMRANGEBYSCORE pattern)
- [ ] Returns `429` with `Retry-After` header when limit exceeded
- [ ] Global: 100 req/min per IP; Auth endpoints: 10 req/min; Authenticated: 60 req/min
- [ ] `SecurityHeadersMiddleware` adds: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`
- [ ] `RequestIdMiddleware` assigns/reads `X-Request-ID` header

**`core/dependencies.py`**
- [ ] `get_current_user()` decodes JWT, fetches User from DB, raises `HTTPException(401)` on failure
- [ ] `require_role(*roles)` is a dependency factory returning a callable
- [ ] `require_verified_email` dependency exists
- [ ] `require_active_subscription` dependency exists

**`workers/tasks.py`**
- [ ] `regenerate_embedding` task calls embedding service and updates `user_embeddings`
- [ ] `missed_checkin_handler` task sends SMS if `now() - last_check_in > check_in_interval_min`
- [ ] `subscription_expiry` task checks for expired subscriptions and downgrades
- [ ] All tasks have `try/except` with error logging — no silent failures

### Fixes to apply if failing
1. Add password strength validator to `RegisterRequest` using `@field_validator`
2. Add E.164 phone validator to `SafeSessionCreate`
3. Add the missing `forgot_password()` always-200 behavior
4. Fix matching score weights to sum to exactly 1.0
5. Add `X-Request-ID` middleware if missing

---

## Phase 4 Audit — AI Services

### Context
You are auditing the four AI microservices (embedding, moderation, image, fake-profile) and the backend's unified AI client. Each service is a standalone FastAPI app.

### Files to read
```
ai-services/embedding-service/main.py
ai-services/embedding-service/model.py
ai-services/embedding-service/schemas.py
ai-services/embedding-service/requirements.txt
ai-services/embedding-service/Dockerfile
ai-services/moderation-service/main.py
ai-services/moderation-service/classifier.py
ai-services/moderation-service/blocklist.py
ai-services/moderation-service/schemas.py
ai-services/moderation-service/requirements.txt
ai-services/moderation-service/Dockerfile
ai-services/image-service/main.py
ai-services/image-service/schemas.py
ai-services/image-service/requirements.txt
ai-services/image-service/Dockerfile
ai-services/fake-profile-service/main.py
ai-services/fake-profile-service/detector.py
ai-services/fake-profile-service/schemas.py
ai-services/fake-profile-service/requirements.txt
ai-services/fake-profile-service/Dockerfile
backend/core/ai_client.py
backend/core/llm_client.py
```

### Checklist

#### Embedding Service (port 9001)

**`main.py`**
- [ ] `POST /embed` accepts `EmbedRequest`, returns `EmbedResponse` with `embedding: list[float]`, `dimension: int`, `model: str`
- [ ] `POST /similarity` accepts two embeddings, returns cosine similarity
- [ ] `GET /health` returns `{"status": "ok", "model_loaded": bool}`

**`model.py`**
- [ ] Uses `SentenceTransformer('all-MiniLM-L6-v2')`
- [ ] `encode()` calls `model.encode(text, normalize_embeddings=True)`
- [ ] Returns `embedding.tolist()` (not numpy array)
- [ ] `dimension` attribute is `384`

**`Dockerfile`**
- [ ] `EXPOSE 9001`
- [ ] Contains `RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"` to pre-download model during build

#### Moderation Service (port 9002)

**`classifier.py`**
- [ ] `threshold_flag = 0.5` and `threshold_block = 0.8`
- [ ] Scores per-category: `harassment`, `hate`, `sexual`, `threat`, `profanity`, `self_harm`
- [ ] `action` logic: `>= 0.8` → `"block"`, `>= 0.5` → `"flag"`, else `"allow"`
- [ ] `_keyword_check()` fast-path exists before ML model call
- [ ] `_model_predict()` uses Detoxify or pattern-based fallback

**`schemas.py`**
- [ ] `TextModerationRequest.context` is `Literal['chat', 'bio', 'report']` with default `'chat'`
- [ ] `TextModerationResponse.action` is `Literal['allow', 'flag', 'block']`

**`Dockerfile`**
- [ ] `EXPOSE 9002`
- [ ] Pre-downloads Detoxify: `RUN python -c "from detoxify import Detoxify; Detoxify('original')"`

#### Image Service (port 9003)
- [ ] `POST /verify/face` returns stub: `{"verified": True, "confidence": 0.95, "message": "Stub: auto-approved"}`
- [ ] `POST /moderate/image` returns stub: `{"is_safe": True, "confidence": 1.0, "categories": [], "action": "allow"}`
- [ ] `GET /health` includes `"note": "stub_service"`
- [ ] `EXPOSE 9003` in Dockerfile

#### Fake Profile Service (port 9004)

**`detector.py` — heuristic weights**
- [ ] `photo_count == 0` → `+0.30`
- [ ] `bio length < 20` chars → `+0.15`
- [ ] `account_age_days < 1` → `+0.10`
- [ ] Disposable email domain → `+0.20`
- [ ] Max neighbor embedding similarity `> 0.95` → `+0.40`
- [ ] Bio matches spam regex (URLs, "DM me on telegram") → `+0.25`
- [ ] Final score clipped to `[0.0, 1.0]`
- [ ] Action: `>= 0.7` → `"block"`, `>= 0.4` → `"review"`, else `"allow"`

**`schemas.py`**
- [ ] `FakeProfileRequest` has `neighbor_embeddings: list[list[float]]` field
- [ ] `FakeProfileResponse` has `fake_probability: float`, `factors: list[str]`, `action: str`

#### `backend/core/ai_client.py`
- [ ] `generate_embedding()`, `moderate_text()`, `moderate_image()`, `verify_face()`, `score_fake_profile()` all present
- [ ] Circuit breaker: after 5 consecutive failures → return safe default and log Sentry WARN
- [ ] Timeouts: 5s for text calls, 15s for image calls
- [ ] Exponential backoff retry: 0.5s → 1s → 2s (max 3 attempts)
- [ ] Safe defaults: moderation → `{"action": "allow"}`, fake-profile → `{"fake_probability": 0.0}`

#### `backend/core/llm_client.py`
- [ ] Provider switchable via `LLM_PROVIDER` env: `'openai'` or `'local'`
- [ ] `complete(prompt, max_tokens, temperature)` and `chat(messages)` methods
- [ ] Redis caches identical responses for 1 hour
- [ ] System prompt enforces LGBTQIA+-affirming language

### Fixes to apply if failing
1. Add pre-download `RUN` step to embedding and moderation Dockerfiles if missing
2. Clip fake-profile score to `[0, 1]` if not already done
3. Add circuit breaker logic to `ai_client.py` if absent
4. Verify moderation thresholds are 0.5 and 0.8 exactly

---

## Phase 5 Audit — Chat System

### Context
You are auditing the real-time WebSocket chat system: socket.io server, Redis presence, message handlers, anonymous mode, and MongoDB integration.

### Files to read
```
backend/websocket/__init__.py
backend/websocket/manager.py
backend/websocket/handlers.py
backend/websocket/anonymous.py
backend/websocket/auth.py
backend/websocket/rate_limit.py
backend/websocket/presence.py
backend/services/chat_service.py
```

### Checklist

#### `websocket/manager.py`
- [ ] `socketio.AsyncServer` created with `async_mode='asgi'`
- [ ] `client_manager=socketio.AsyncRedisManager(settings.REDIS_URL)` for horizontal scaling
- [ ] `maxHttpBufferSize` set to `64 * 1024` (64KB) to prevent oversized payloads
- [ ] `cors_allowed_origins` taken from `settings.CORS_ORIGINS`

**`connect()` handler — all steps present:**
- [ ] 1. Extracts JWT from `auth` parameter
- [ ] 2. Decodes and validates token (raises `ConnectionRefusedError` on failure — not just returns)
- [ ] 3. Rejects if `user.is_banned` or `user.is_active == False` with `ConnectionRefusedError`
- [ ] 4. Per-user connection rate limit: Redis key `ws_connect:{user_id}`, max 10/min
- [ ] 5. Stores: `HSET ws_sessions sid user_id`, `SADD ws_user:{user_id} sid`, `SET online:{user_id} 1 EX 60`
- [ ] 6. Joins user to all their active thread rooms via `sio.enter_room`
- [ ] 7. Emits `user_online` to relevant thread rooms
- [ ] 8. Delivers queued messages from `offline_queue:{user_id}` Redis list

**`disconnect()` handler:**
- [ ] Removes sid from `ws_user:{user_id}` set
- [ ] Only emits `user_offline` and clears `online:{user_id}` when the **last** sid for that user is removed
- [ ] Updates `users.last_seen` in DB

**`heartbeat()` handler:**
- [ ] Refreshes `online:{user_id}` TTL to 60s

#### `websocket/handlers.py` — `handle_send_message`

All 14 steps must be present in order:
- [ ] 1. Authenticate: get user_id from Redis sid mapping; emit `error` if not found
- [ ] 2. Per-user rate limit (30/min, sliding window); emit `error` code `rate_limited` on overflow
- [ ] 3. Validate content: text 1–2000 chars; message_type in allowed enum; image = S3 URL; location = valid JSON `{lat, lng}`
- [ ] 4. Validate user is participant in `thread_id` (DB check)
- [ ] 5. Check `thread.is_active == True`; emit `error` code `thread_inactive` if not
- [ ] 6. Check neither participant has blocked the other; emit `error` code `blocked` if so
- [ ] 7. Idempotency: look up MongoDB by `(thread_id, sender_id, client_message_id)` — if exists, re-emit existing message and return
- [ ] 8. Anonymous mode: transform sender_id via `AnonymousMessageFilter` if `thread.is_anonymous`
- [ ] 9. Insert message document in MongoDB
- [ ] 10. Update `ChatThread.last_message_at` in PostgreSQL
- [ ] 11. Emit `new_message` to thread room
- [ ] 12. Trigger async moderation via `asyncio.create_task(moderate_message_async(...))`
- [ ] 13. If recipient offline: send FCM push notification + append to `offline_queue:{recipient_id}`
- [ ] 14. Append toxicity score to user rolling window in Redis

**Other handlers:**
- [ ] `typing_start` → emit `user_typing` with `{user_id, thread_id}`
- [ ] `typing_stop` → emit `user_stopped_typing`
- [ ] `mark_read` → update `read_by` in MongoDB, emit `messages_read`
- [ ] `get_online_status` → check Redis `online:{user_id}` for each requested user_id

#### `websocket/anonymous.py`
- [ ] Redis key `anon_map:{thread_id}:{user_id}` → `"anon_1"` or `"anon_2"`
- [ ] Images blocked in anonymous threads
- [ ] Location metadata stripped from messages
- [ ] Consistent mapping: same user always gets same anon identifier within a thread

#### `websocket/rate_limit.py`
- [ ] Uses Redis ZADD with current timestamp + ZREMRANGEBYSCORE to implement sliding window
- [ ] Does NOT use simple counter (INCR/EXPIRE) — that is a fixed window, not sliding

#### `services/chat_service.py` — MongoDB operations
- [ ] `store_message()` uses `insert_one` and returns `str(result.inserted_id)`
- [ ] `get_messages()` filters `is_deleted=False`, sorts `-created_at`, paginates
- [ ] `delete_message()` sets `is_deleted=True` (soft delete), only by sender
- [ ] `idempotency_check()` method (or inline) queries by `(thread_id, sender_id, client_message_id)`

#### MongoDB indexes (created on startup)
- [ ] `(thread_id, created_at)` compound index
- [ ] `sender_id` index
- [ ] `(thread_id, read_by)` compound index
- [ ] These are created in `main.py` startup or equivalent startup function

### Fixes to apply if failing
1. Change `connect()` to raise `ConnectionRefusedError` (not return False) for banned/inactive users
2. Replace simple counter rate limiting with Redis sorted set sliding window
3. Add `client_message_id` idempotency check if missing from `handle_send_message`
4. Add anonymous filter image-blocking logic if absent
5. Add MongoDB index creation to startup sequence

---

## Phase 6 Audit — Frontend

### Context
You are auditing the Next.js 14 App Router frontend: pages, components, state stores, API/socket clients, middleware, i18n, PWA config, and accessibility.

### Files to read
```
frontend/src/app/layout.tsx
frontend/src/app/page.tsx
frontend/src/app/globals.css
frontend/src/app/(auth)/login/page.tsx
frontend/src/app/(auth)/register/page.tsx
frontend/src/app/(main)/discover/page.tsx
frontend/src/app/(main)/chat/[threadId]/page.tsx
frontend/src/app/(main)/safety/page.tsx
frontend/src/app/(premium)/subscription/page.tsx
frontend/src/lib/api.ts
frontend/src/lib/socket.ts
frontend/src/stores/authStore.ts
frontend/src/stores/chatStore.ts
frontend/src/middleware.ts
frontend/src/i18n/config.ts
frontend/src/i18n/locales/en.json
frontend/src/i18n/locales/hi.json
frontend/public/manifest.json
frontend/public/robots.txt
frontend/src/components/ui/Modal.tsx
frontend/src/components/ui/Button.tsx
frontend/src/components/chat/MessageBubble.tsx
frontend/src/components/safety/SOSButton.tsx
frontend/src/types/index.ts
```

### Checklist

#### `app/(auth)/register/page.tsx` — 4-step registration
- [ ] Step 1: `email`, `password`, `confirmPassword` — password match validation
- [ ] Step 2: `display_name`, `age` (≥18 validated client-side), `gender_identity`, `sexual_orientation`, `pronouns`
- [ ] Step 3: `intent` selection — one of `exploring/serious/discreet/friendship` — required
- [ ] Step 4: `preferred_genders` multi-select, age range slider, max distance slider
- [ ] Progress indicator visible at top
- [ ] Framer Motion transitions between steps
- [ ] On final submit: calls `POST /api/v1/auth/register` → stores tokens → redirects to `/discover`

#### `app/(main)/discover/page.tsx`
- [ ] Renders swipe card stack
- [ ] Framer Motion drag gesture for swipe left/right
- [ ] Like (heart), Pass (X), Super Like (star) actions
- [ ] On like: calls `POST /api/v1/matches/{user_id}/like`
- [ ] On mutual match: shows "It's a Match!" overlay
- [ ] Empty state: "No more profiles. Check back later!"

#### `app/(main)/chat/[threadId]/page.tsx`
- [ ] Sent messages: right-aligned, purple background
- [ ] Received messages: left-aligned, gray background
- [ ] Moderated messages: blurred/hidden with "This message was flagged" text
- [ ] Typing indicator: animated dots
- [ ] Read receipts: double-check marks
- [ ] `useEffect` connects socket on mount, disconnects on unmount
- [ ] Auto-scrolls to bottom on new messages
- [ ] Infinite scroll for message history (loads older messages on scroll up)

#### `app/(main)/safety/page.tsx`
- [ ] Form: emergency contact name + phone, meeting location, scheduled time, check-in interval
- [ ] Active session view: timer, "Check In" button, SOS button (large, red)
- [ ] SOS button calls `POST /api/v1/safety/sos`
- [ ] Map component showing live location (if enabled)
- [ ] Session history list

#### `app/(premium)/subscription/page.tsx`
- [ ] 4 plan cards: Free, Plus (₹499), Premium (₹999), Elite (₹1999)
- [ ] Monthly/Yearly pricing toggle
- [ ] Current plan highlighted
- [ ] FAQ accordion at bottom

#### `lib/api.ts`
- [ ] Axios instance with `baseURL: process.env.NEXT_PUBLIC_API_URL || '/api/v1'`
- [ ] Request interceptor: attaches `Authorization: Bearer {token}` from `authStore`
- [ ] Response interceptor on 401: calls `authStore.refreshToken()` once, then retries original request
- [ ] 401 interceptor has guard to **prevent infinite loop** (tracks whether refresh already attempted)

#### `lib/socket.ts`
- [ ] `io(WS_URL, { auth: { token }, transports: ['websocket', 'polling'], reconnection: true })`
- [ ] `reconnectionDelay: 1000`, `reconnectionDelayMax: 5000`
- [ ] Registers server event handlers: `new_message` → `chatStore.addMessage()`, `user_typing` → `chatStore.setTyping()`, `messages_read` → `chatStore.markRead()`, `user_online`/`user_offline` → `chatStore.onlineUsers`
- [ ] `token_expiring` event triggers token refresh + reconnect

#### `stores/authStore.ts`
- [ ] All required state: `user`, `accessToken`, `isAuthenticated`, `isLoading`
- [ ] All required actions: `login()`, `register()`, `logout()`, `refreshToken()`, `fetchCurrentUser()`
- [ ] `logout()` clears token and calls `socket.disconnect()`

#### `stores/chatStore.ts`
- [ ] `messages: Record<string, Message[]>` — keyed by threadId
- [ ] `typingUsers: Record<string, string[]>` — keyed by threadId
- [ ] `onlineUsers: Set<string>`
- [ ] `unreadCounts: Record<string, number>`

#### `middleware.ts`
- [ ] Redirects unauthenticated requests to `(main)/*` → `/login`
- [ ] Redirects authenticated users from `(auth)/*` → `/discover`
- [ ] Handles locale detection, sets `NEXT_LOCALE` cookie

#### Accessibility
- [ ] `Modal.tsx`: `role="dialog"`, `aria-modal="true"`, focus trap implemented
- [ ] `Button.tsx`: loading state uses `aria-busy="true"`
- [ ] Icon-only buttons have `aria-label`
- [ ] All `<img>` in `ProfileCard`, `Avatar` have non-empty `alt`
- [ ] Forms use `aria-invalid` + `aria-describedby` for error messages
- [ ] Main layout has skip-to-content link
- [ ] `prefers-reduced-motion` media query disables Framer Motion spring on swipe

#### `public/manifest.json`
- [ ] `"name": "Elyra"`, `"short_name": "Elyra"`
- [ ] `"theme_color": "#7C3AED"`
- [ ] Icons array with 192x192 and 512x512 entries

#### `public/robots.txt`
- [ ] Allows: `/`, `/login`, `/register`
- [ ] Disallows: `/chat/`, `/profile/`, `/settings/`

#### `src/types/index.ts`
- [ ] TypeScript interfaces exist for: `User`, `PublicProfile`, `PrivateProfile`, `UserPreference`, `Match`, `MatchCandidate`, `ChatThread`, `Message`, `Notification`, `SafeSession`, `Subscription`, `Payment`

#### i18n
- [ ] `en.json` and `hi.json` have matching keys
- [ ] All user-facing strings in components use `useTranslations()` — no hardcoded English strings in JSX text content

### Fixes to apply if failing
1. Add 401 infinite-loop guard to `api.ts` interceptor
2. Add `role="dialog"` and focus trap to `Modal.tsx`
3. Add `prefers-reduced-motion` check before enabling Framer Motion spring physics
4. Ensure `robots.txt` disallows private routes
5. Add missing TypeScript interface fields to `types/index.ts`

---

## Phase 7 Audit — Integration

### Context
You are auditing the wiring between all services: event system, startup sequence, CORS/proxy config, seed data, and observability stack.

### Files to read
```
backend/core/events.py
backend/main.py
backend/core/logging.py
backend/core/metrics.py
frontend/.env.local.example
frontend/next.config.js
infra/scripts/seed_data.py
infra/scripts/run-migrations.sh
infra/scripts/smoke-test.sh
infra/monitoring/prometheus.yml
infra/monitoring/grafana-dashboard.json
```

### Checklist

#### `core/events.py`

**`EventPublisher`**
- [ ] `publish(channel, event_type, data)` serializes payload as JSON with `event`, `data`, `timestamp` fields
- [ ] Uses `await self.redis.publish(channel, payload)` (async)

**`EventSubscriber.HANDLERS` dict — all 9 event types mapped:**
- [ ] `user.registered` → `[handle_send_email_verification, handle_initial_embedding, handle_score_new_profile]`
- [ ] `profile.updated` → `[handle_update_embedding, handle_score_profile]`
- [ ] `preferences.updated` → `[handle_update_embedding]`
- [ ] `message.sent` → `[handle_moderate_message]`
- [ ] `match.created` → `[handle_create_chat_thread, handle_match_notification]`
- [ ] `report.created` → `[handle_risk_recalculation, handle_moderator_alert]`
- [ ] `payment.completed` → `[handle_activate_subscription, handle_payment_notification]`
- [ ] `safety.sos` → `[handle_sms_emergency_contact, handle_moderator_alert]`
- [ ] `safety.checkin_missed` → `[handle_sms_emergency_contact]`

**`EventSubscriber.start()`**
- [ ] Uses `await pubsub.subscribe("elyra:events")`
- [ ] Dispatches handlers via `asyncio.create_task(handler(event["data"]))` — non-blocking

#### `backend/main.py` — startup lifespan

All startup steps present:
- [ ] 1. Connect PostgreSQL (create engine)
- [ ] 2. Connect MongoDB (create Motor client)
- [ ] 3. Connect Redis (create pool)
- [ ] 4. Create MongoDB indexes (`messages` collection)
- [ ] 5. Start `EventSubscriber` as background task
- [ ] 6. Verify AI service health checks (ping all 4 services)
- [ ] 7. Initialize Sentry (`sentry_sdk.init(...)`)
- [ ] 8. Mount Prometheus instrumentator

#### `core/logging.py`
- [ ] Uses `structlog` configured for JSON output
- [ ] Log fields include: `timestamp`, `level`, `event`, `request_id`, `user_id`, `path`, `latency_ms`, `status_code`
- [ ] Email addresses masked: e.g., `"a**@example.com"` — NOT full email
- [ ] Phone numbers masked — NOT full number
- [ ] Private profile field values **never** appear in any log call

#### `core/metrics.py`
Custom Prometheus metrics defined:
- [ ] `elyra_messages_sent_total` — Counter with labels `thread_id_hash`, `moderated`
- [ ] `elyra_match_score_histogram` — Histogram
- [ ] `elyra_ai_call_latency_seconds` — Histogram with labels `service`, `endpoint`
- [ ] `elyra_ws_connections_active` — Gauge
- [ ] `elyra_safety_event_total` — Counter with label `event_type`
- [ ] `elyra_subscription_total` — Counter with labels `tier`, `status`

#### `infra/scripts/smoke-test.sh`
- [ ] All 5 checks implemented: health, register, `/auth/me`, `/matches/discover`, WebSocket connect
- [ ] Uses `set -e` — exits on first failure
- [ ] Exits non-zero if any check fails
- [ ] Each step prints result to stdout

#### `infra/scripts/run-migrations.sh`
- [ ] Uses `until pg_isready -h $POSTGRES_HOST ...` wait loop with sleep
- [ ] Runs `alembic upgrade head`
- [ ] Creates `vector` extension

#### `infra/scripts/seed_data.py`
- [ ] Creates exactly 10 test users with varied profiles
- [ ] Diverse demographics: mix of gender identities, orientations, intents
- [ ] Creates 5 mutual matches
- [ ] Creates 3 chat threads with sample messages stored in MongoDB
- [ ] Creates 1 premium subscription
- [ ] Generates embeddings for all users via embedding service API call

#### `infra/monitoring/prometheus.yml`
- [ ] Scrape job for backend at `backend:8000/metrics`
- [ ] Scrape job for embedding service at `embedding-service:9001/metrics` (or health)
- [ ] Scrape job for moderation service at `moderation-service:9002`
- [ ] Scrape job for image service at `image-service:9003`

### Fixes to apply if failing
1. Add missing event type handlers to `EventSubscriber.HANDLERS`
2. Add `asyncio.create_task` wrapping in subscriber to prevent blocking
3. Add PII masking to structlog processors
4. Add all 6 custom Prometheus metrics if any are missing
5. Add `set -e` to smoke-test.sh and verify it exits non-zero on failure

---

## Phase 8 Audit — Deployment Configs

### Context
You are auditing all Docker, Docker Compose, Kubernetes, and NGINX configuration files.

### Files to read
```
app/backend/Dockerfile
app/frontend/Dockerfile
app/infra/nginx/Dockerfile
app/infra/nginx/nginx.conf
app/ai-services/embedding-service/Dockerfile
app/ai-services/moderation-service/Dockerfile
app/ai-services/image-service/Dockerfile
app/ai-services/fake-profile-service/Dockerfile
app/docker-compose.yml
app/docker-compose.test.yml
app/.env.example
app/infra/k8s/namespace.yaml
app/infra/k8s/backend-deployment.yaml
app/infra/k8s/celery-deployment.yaml
app/infra/k8s/frontend-deployment.yaml
app/infra/k8s/postgres-deployment.yaml
app/infra/k8s/redis-deployment.yaml
app/infra/k8s/mongodb-deployment.yaml
app/infra/k8s/ai-services-deployment.yaml
app/infra/k8s/nginx-ingress.yaml
app/infra/k8s/secrets.yaml
app/infra/k8s/configmap.yaml
app/infra/k8s/network-policy.yaml
app/infra/k8s/backup-cronjob.yaml
app/.github/workflows/ci.yml
```

### Checklist

#### `backend/Dockerfile`
- [ ] Base image: `python:3.11-slim`
- [ ] Installs `gcc libpq-dev` (required for `asyncpg` compilation)
- [ ] Creates non-root user `appuser` and `chown -R appuser /app`
- [ ] Runs as `USER appuser`
- [ ] `HEALTHCHECK` uses `python -c "import httpx; httpx.get('http://localhost:8000/api/v1/health')"`
- [ ] CMD: `uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4`

#### `frontend/Dockerfile`
- [ ] Multi-stage: `builder` stage (node:20-alpine) + `runner` stage (node:20-alpine)
- [ ] Builder runs `npm ci` then `npm run build`
- [ ] Runner uses `nextjs` system user (uid 1001)
- [ ] Copies `.next/standalone` and `.next/static`
- [ ] `HEALTHCHECK` uses `wget --spider http://localhost:3000`
- [ ] CMD: `node server.js`

#### `docker-compose.yml`

**PostgreSQL service:**
- [ ] Image: `pgvector/pgvector:pg16` — NOT `postgres:16-alpine` (critical: pgvector must be pre-installed)
- [ ] `healthcheck` uses `pg_isready -U elyra_user -d elyra`
- [ ] Mounts `./infra/scripts/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh`

**Backend service:**
- [ ] `depends_on` with `condition: service_healthy` for postgres, redis, mongodb
- [ ] `env_file: .env`

**All services:**
- [ ] `embedding-service` on port 9001
- [ ] `moderation-service` on port 9002
- [ ] `image-service` on port 9003
- [ ] `fake-profile-service` on port 9004
- [ ] `celery-worker` and `celery-beat` are separate services
- [ ] `prometheus` and `grafana` use `profiles: [observability]`
- [ ] `minio` + `minio-init` services present for local S3
- [ ] All named volumes defined at the bottom

#### `infra/nginx/nginx.conf`
- [ ] `limit_req_zone` for `api` zone: `100r/m`
- [ ] `limit_req_zone` for `auth` zone: `10r/m`
- [ ] `/api/` location: `limit_req zone=api burst=20 nodelay`
- [ ] `/api/v1/auth/` location: `limit_req zone=auth burst=5 nodelay`
- [ ] `/socket.io/` location has `proxy_http_version 1.1`, `Upgrade $http_upgrade`, `Connection "upgrade"`, `proxy_read_timeout 86400`
- [ ] All proxy headers set: `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`
- [ ] `/_next/webpack-hmr` location has WebSocket upgrade headers

#### Kubernetes manifests

**`backend-deployment.yaml`**
- [ ] `replicas: 3`
- [ ] Resource requests: `cpu: "250m"`, `memory: "512Mi"`
- [ ] Resource limits: `cpu: "1000m"`, `memory: "1Gi"`
- [ ] `livenessProbe`: `httpGet /api/v1/health`, `initialDelaySeconds: 20`, `periodSeconds: 30`
- [ ] `readinessProbe`: `httpGet /api/v1/health/ready`, `initialDelaySeconds: 10`, `periodSeconds: 10`
- [ ] HPA: `minReplicas: 2`, `maxReplicas: 10`, CPU target 70%, memory target 75%

**`postgres-deployment.yaml`**
- [ ] `StatefulSet` (not `Deployment`)
- [ ] Image: `pgvector/pgvector:pg16`
- [ ] PVC: 20Gi
- [ ] Resource limits: `cpu: "2000m"`, `memory: "4Gi"`

**`celery-deployment.yaml`**
- [ ] Worker: `replicas: 2`, no `Service`
- [ ] Beat: `replicas: 1`, `strategy: type: Recreate`

**`nginx-ingress.yaml`**
- [ ] Host: `elyra.app`
- [ ] TLS with `cert-manager.io/cluster-issuer: "letsencrypt-prod"` annotation
- [ ] WebSocket annotation: `nginx.ingress.kubernetes.io/websocket-services: "backend-service"`
- [ ] Path `/api` → `backend-service:8000`
- [ ] Path `/socket.io` → `backend-service:8000`
- [ ] Path `/` → `frontend-service:3000`

**`network-policy.yaml`**
- [ ] Default-deny-all ingress policy exists
- [ ] Backend pods can receive from NGINX ingress
- [ ] AI services can only receive from backend pods (label `app=backend`)
- [ ] Postgres/Redis/MongoDB can only receive from backend + worker pods

**`backup-cronjob.yaml`**
- [ ] Schedule: `"0 2 * * *"` (02:00 UTC nightly)
- [ ] Runs `pg_dump` and uploads to S3

#### `.github/workflows/ci.yml`
- [ ] Job `lint-backend`: runs `ruff check .` and `mypy . --ignore-missing-imports`
- [ ] Job `lint-frontend`: runs `eslint` and `tsc --noEmit`
- [ ] Job `test-backend`: spins up postgres/redis/mongo service containers, runs `pytest --cov`
- [ ] Job `build-images`: uses `docker buildx`, pushes to GHCR on push to `main` or tag
- [ ] Job `deploy-staging`: triggers on push to `main`, runs `kubectl apply`
- [ ] Job `deploy-prod`: requires manual approval

### Fixes to apply if failing
1. Change `postgres` image to `pgvector/pgvector:pg16` in docker-compose if using wrong image
2. Add `proxy_read_timeout 86400` to socket.io NGINX location
3. Add `strategy: type: Recreate` to celery-beat Deployment
4. Add default-deny NetworkPolicy if missing
5. Add `cert-manager` annotation to Ingress

---

## Phase 9 Audit — Testing

### Context
You are auditing the backend pytest test suite, frontend Playwright E2E tests, load tests, and security tests.

### Files to read
```
backend/tests/conftest.py
backend/tests/unit/test_security.py
backend/tests/unit/test_matching.py
backend/tests/unit/test_risk_scoring.py
backend/tests/unit/test_schemas.py
backend/tests/api/test_auth.py
backend/tests/api/test_profiles.py
backend/tests/api/test_matches.py
backend/tests/api/test_safety.py
backend/tests/api/test_payments.py
backend/tests/websocket/test_chat_ws.py
backend/tests/integration/test_registration_flow.py
backend/tests/integration/test_matching_flow.py
backend/tests/security/test_rate_limiting.py
backend/tests/security/test_authz.py
backend/tests/security/test_encryption.py
backend/pytest.ini
backend/requirements-test.txt
frontend/playwright.config.ts
frontend/e2e/auth.spec.ts
frontend/e2e/discover.spec.ts
frontend/e2e/chat.spec.ts
frontend/e2e/safety.spec.ts
frontend/e2e/a11y.spec.ts
tests/load/locustfile.py
app/docker-compose.test.yml
```

### Checklist

#### `backend/tests/conftest.py`

- [ ] `engine` fixture is `scope="session"` — creates tables once per test run
- [ ] `db_session` fixture uses a DB transaction that **rolls back** after each test (not truncate)
- [ ] `client` fixture uses `AsyncClient(transport=ASGITransport(app=app), base_url="http://test")`
- [ ] `client` fixture overrides `get_db` dependency: `app.dependency_overrides[get_db] = override_get_db`
- [ ] `auth_headers` fixture registers a test user and returns `{"Authorization": "Bearer {token}"}`
- [ ] `second_user_headers` fixture for a different test user (different email)

#### `pytest.ini`
- [ ] `asyncio_mode = auto`
- [ ] `testpaths = tests`
- [ ] Markers defined: `unit`, `api`, `websocket`, `integration`, `slow`

#### Unit Tests

**`test_security.py`**
- [ ] Tests: `test_hash_password_returns_hash`, `test_verify_correct_password`, `test_verify_incorrect_password`, `test_hash_is_not_plaintext`
- [ ] JWT tests: create, decode, expired raises, invalid raises, correct expiry
- [ ] Encryption tests: roundtrip, different plaintexts → different ciphertexts, wrong key fails, **tampered ciphertext fails** (GCM auth tag test)

**`test_matching.py`**
- [ ] Tests score components individually
- [ ] `test_composite_score_in_range`: asserts result is `0.0 <= score <= 1.0`
- [ ] Filtering tests: blocked/invisible/already-liked users excluded

**`test_schemas.py`**
- [ ] `test_register_age_below_18`: asserts `ValidationError` raised
- [ ] `test_register_weak_password`: asserts `ValidationError` raised
- [ ] `test_age_min_greater_than_max`: preference schema validation

#### API Tests

**`test_auth.py`**
- [ ] `test_register_duplicate_email`: asserts HTTP 409 or 422
- [ ] `test_login_wrong_password`: asserts HTTP 401
- [ ] `test_refresh_rotates_tokens`: asserts old token no longer valid after refresh
- [ ] `test_logout_invalidates_token`: asserts refresh token rejected after logout

**`test_profiles.py`**
- [ ] `test_update_private_profile_encrypted`: reads raw `LargeBinary` from DB, asserts plaintext NOT present
- [ ] `test_view_private_without_reveal_403`: asserts HTTP 403
- [ ] `test_reveal_then_view_private_success`: full reveal flow working

**`test_safety.py`**
- [ ] `test_report_self_fails`: asserts appropriate error
- [ ] `test_block_self_fails`: asserts appropriate error
- [ ] `test_blocked_user_hidden_from_discover`: after blocking, user does not appear in discovery results

#### WebSocket Tests (`test_chat_ws.py`)
- [ ] `test_connect_with_invalid_token_rejected`: asserts connection refused
- [ ] `test_send_message`: message stored in MongoDB, broadcast to room
- [ ] `test_moderated_message_flagged`: toxic content triggers moderation flag
- [ ] `test_anonymous_mode_hides_identity`: sender_id replaced with `anon_1`/`anon_2`

#### Integration Tests

**`test_registration_flow.py`**
- [ ] Checks `user_embeddings` table has a row after registration
- [ ] Checks `public_profiles` and `user_preferences` rows exist

**`test_matching_flow.py`**
- [ ] User A likes B → no `Match` row with `status='matched'`
- [ ] User B likes A → `Match` row exists with `status='matched'`, `matched_at` not null
- [ ] `ChatThread` row created for the match
- [ ] Notification records created for both users

#### Security Tests

**`test_rate_limiting.py`**
- [ ] Send 11 login requests rapidly → 11th returns HTTP 429
- [ ] 31st WebSocket `send_message` emits `error` event with `code='rate_limited'`

**`test_authz.py`**
- [ ] `user` role → 403 on `GET /api/v1/safety/reports` (moderator-only)
- [ ] User A cannot access User B's private profile without reveal
- [ ] Expired access token → 401
- [ ] Revoked refresh token → 401

**`test_encryption.py`**
- [ ] Update private profile with known plaintext value
- [ ] Read raw `LargeBinary` column from DB directly
- [ ] Assert that the plaintext string does NOT appear as bytes in the stored value
- [ ] Decrypt using `core/security.decrypt_field()` → assert matches original plaintext
- [ ] Tamper a single byte of ciphertext → assert `decrypt_field()` raises exception

#### Frontend E2E (`playwright.config.ts`)
- [ ] `testDir: './e2e'`
- [ ] `fullyParallel: true`
- [ ] `retries: process.env.CI ? 2 : 0`
- [ ] Projects include: `Desktop Chrome` and `Pixel 7` (mobile)
- [ ] `trace: 'retain-on-failure'`

**`e2e/auth.spec.ts`**
- [ ] Register with fresh email, verify redirect to /discover
- [ ] Login with existing credentials
- [ ] Logout, verify redirect to landing
- [ ] Password reset round-trip (send email → click link → set new password → login)

**`e2e/chat.spec.ts`**
- [ ] Opens thread in two browser contexts (sender + receiver)
- [ ] Types message in context 1, asserts it appears in context 2

**`e2e/a11y.spec.ts`**
- [ ] Uses `@axe-core/playwright`
- [ ] Runs on: landing, login, discover, chat, safety pages
- [ ] Asserts `violations.filter(v => v.impact === 'critical').length === 0`

#### Load Tests (`tests/load/locustfile.py`)
- [ ] `ElyraUser` class with `wait_time = between(1, 3)`
- [ ] `on_start()` registers a unique user
- [ ] `@task(3) def discover()` — highest frequency
- [ ] `@task(1) def like_random()`
- [ ] `@task(2) def open_profile()`
- [ ] Perf targets documented: p50 < 200ms, p95 < 500ms for `/discover`

### Fixes to apply if failing
1. Add `scope="session"` to engine fixture
2. Add rollback to `db_session` fixture using `await session.rollback()`
3. Add GCM auth tag tamper test to `test_security.py`
4. Add `test_blocked_user_hidden_from_discover` if missing
5. Add `@axe-core/playwright` to `a11y.spec.ts` if using manual checks instead

---

## Final End-to-End Verification

After all 9 phases pass, run these checks:

```bash
# 1. Backend imports cleanly
cd /home/kaarthikeya/Elyra-main/codebase/app/backend
python -c "from main import app; print('✓ Backend imports OK')"

# 2. Frontend types compile
cd /home/kaarthikeya/Elyra-main/codebase/app/frontend
npx tsc --noEmit && echo "✓ Frontend types OK"

# 3. Backend lint
cd /home/kaarthikeya/Elyra-main/codebase/app/backend
ruff check . --output-format=concise
mypy . --ignore-missing-imports --no-error-summary

# 4. Frontend lint
cd /home/kaarthikeya/Elyra-main/codebase/app/frontend
npx eslint src/ --max-warnings 0

# 5. Docker Compose up
cd /home/kaarthikeya/Elyra-main/codebase/app
docker compose up --build -d
sleep 30
curl -fsS http://localhost/api/v1/health | grep '"status":"ok"'

# 6. Smoke test
bash infra/scripts/smoke-test.sh

# 7. K8s dry-run
kubectl apply --dry-run=client -k infra/k8s/
```

### Final Verification Checklist
- [ ] All imports clean — no `ImportError` or `ModuleNotFoundError`
- [ ] `ruff check` — 0 errors
- [ ] `mypy` — 0 errors (or documented acceptable ignores)
- [ ] `tsc --noEmit` — 0 errors
- [ ] `eslint --max-warnings 0` — 0 warnings
- [ ] All 5 smoke test checks pass
- [ ] K8s dry-run passes for all manifests
- [ ] `pytest tests/ -v --cov` — coverage ≥ 80% overall
- [ ] Playwright E2E — all specs pass on Desktop Chrome
- [ ] AI services all return `{"status": "ok"}` on `/health`
