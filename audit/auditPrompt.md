You are performing a full audit, validation, and remediation of the Elyra codebase located at /home/kaarthikeya/Elyra-main/codebase/app. This is a privacy-first, AI-enabled LGBTQIA+ dating platform for India built as a monorepo. Your job is to validate every file against the architectural plan, fix all gaps, and leave behind a fully functional, lint-clean codebase.

---

## CODEBASE LOCATION

Primary codebase root: /home/kaarthikeya/Elyra-main/codebase/app

Start by running:
  find /home/kaarthikeya/Elyra-main/codebase/app -type f | sort

to get a complete picture of what exists, then cross-reference against every checklist below.

NOTE: All paths in the checklists below are relative to the codebase root above. For example, "app/backend/requirements.txt" refers to /home/kaarthikeya/Elyra-main/codebase/app/backend/requirements.txt.

---

## TECH STACK (source of truth)

- Backend: FastAPI (Python 3.11+), SQLAlchemy 2.0 async, Alembic, asyncpg, Motor (MongoDB), redis.asyncio, Celery, python-socketio, httpx, structlog, Sentry, Prometheus
- Frontend: Next.js 14 App Router, TypeScript, Tailwind CSS 3, Zustand, Axios, socket.io-client, framer-motion, next-intl, next-pwa, @sentry/nextjs
- AI Services: FastAPI microservices — embedding (sentence-transformers all-MiniLM-L6-v2, port 9001), moderation (Detoxify, port 9002), image stub (port 9003), fake-profile (port 9004)
- Databases: PostgreSQL 16 + pgvector, MongoDB 7, Redis 7
- Infra: Docker Compose, Kubernetes manifests, NGINX, MinIO (dev S3), Celery worker + beat

---

## PHASE-BY-PHASE VALIDATION CHECKLISTS

### PHASE 1 — Architecture & Scaffold
Verify these files exist and are correct:
- app/README.md — project overview, quickstart, architecture
- app/.gitignore — covers Python, Node, .env, .next, __pycache__, *.pyc, dist, build
- app/.dockerignore
- app/.env.example — ALL variable groups: App, PostgreSQL, Redis, MongoDB, JWT, Encryption, AI Services, LLM, CORS, Rate Limiting, Storage, Email/SMS, Push Notifications, Payment Gateway, Observability, TEST_DATABASE_URL
- app/backend/requirements.txt — all production deps (fastapi, uvicorn, sqlalchemy[asyncio], asyncpg, alembic, pgvector, motor, redis, pydantic, pydantic-settings, email-validator, python-jose[cryptography], passlib[bcrypt], cryptography, celery, httpx, python-socketio, boto3, pillow, structlog, prometheus-fastapi-instrumentator, sentry-sdk[fastapi], aiosmtplib, twilio, firebase-admin, razorpay)
- app/backend/requirements-test.txt — pytest, pytest-asyncio, pytest-cov, pytest-xdist, httpx, factory-boy, faker, respx, fakeredis, mongomock-motor, locust
- app/backend/core/config.py — Pydantic Settings class with ALL env vars from .env.example
- app/backend/main.py — FastAPI app + all routers mounted + socket.io ASGI mount + lifespan events
- app/frontend/package.json — all deps (next 14, react, tailwindcss, zustand, axios, socket.io-client, framer-motion, @heroicons/react, lucide-react, react-hot-toast, date-fns, next-intl, @sentry/nextjs, next-pwa, react-leaflet, leaflet) and devDeps
- app/frontend/tailwind.config.ts — custom theme with brand colors (#7C3AED primary, #EC4899 secondary, #06B6D4 accent), dark mode, custom animations
- app/frontend/next.config.js — API rewrites to backend, socket.io rewrite, next-pwa wrap (production only), Sentry plugin
- app/mobile/package.json, app.json, App.tsx, README.md — scaffold only
- app/infra/nginx/nginx.conf — stub
- app/docker-compose.yml — stub
- All __init__.py files in every Python package directory under backend/ and ai-services/

### PHASE 2 — Database Models + Migrations
Verify these files exist and implement the exact schemas described:

Models:
- backend/models/__init__.py — imports all models
- backend/models/base.py — DeclarativeBase + TimestampMixin
- backend/models/user.py — User with: id(UUID PK), email(unique), phone(unique nullable), password_hash, role(enum: user/premium_user/verified_user/moderator/admin), is_active, is_verified, email_verified, phone_verified, is_banned, failed_login_count, locked_until, last_login, last_seen, deleted_at, created_at, updated_at
- backend/models/profile.py — PublicProfile (display_name, age, gender_identity, sexual_orientation, pronouns, bio, city, state, latitude, longitude, profile_photo_url, photos JSONB, intent enum, is_visible) + PrivateProfile (real_name_enc LargeBinary, phone_enc, address_enc, id_document_enc, reveal_to JSONB)
- backend/models/preference.py — UserPreference (preferred_genders JSONB, preferred_orientations JSONB, age_min, age_max, max_distance_km, preferred_intents JSONB, deal_breakers JSONB)
- backend/models/match.py — Match with UniqueConstraint(user_id_1, user_id_2) and CheckConstraint(user_id_1 < user_id_2), status enum, liked_by_1, liked_by_2, match_score, matched_at
- backend/models/chat.py — ChatThread with match_id FK, participant_1, participant_2, is_active, is_anonymous, last_message_at
- backend/models/chat_message.py — Pydantic model for MongoDB document (thread_id, sender_id, content, message_type, is_moderated, moderation_result dict, is_deleted, read_by list, metadata, created_at, updated_at, client_message_id)
- backend/models/safety.py — SafetyEvent (event_metadata attr → "metadata" SQL column name), Report, Block with UniqueConstraint
- backend/models/embedding.py — UserEmbedding with Vector(384) from pgvector.sqlalchemy
- backend/models/subscription.py — Subscription with tier enum (free/plus/premium/elite)
- backend/models/payment.py — Payment with Numeric(10,2), currency, gateway fields
- backend/models/notification.py — Notification + DeviceToken (platform enum: ios/android/web)
- backend/models/safe_session.py — SafeSession with all fields including check_in_interval_min, live_location_enabled, status enum
- backend/models/verification.py — EmailVerification + PhoneVerification (otp_hash, attempts) + PasswordResetToken
- backend/models/audit.py — AuditLog (actor_id nullable, action, target_type, target_id, ip_address, user_agent, extra JSONB)

Core DB:
- backend/core/database.py — async engine (asyncpg), async_sessionmaker, Base, get_db() dependency
- backend/core/mongodb.py — AsyncIOMotorClient, get_mongo_db()
- backend/core/redis_client.py — redis.asyncio pool, get_redis()
- backend/core/security.py — encrypt_field/decrypt_field (AES-256-GCM with random nonce), hash_password/verify_password (bcrypt), create_access_token/create_refresh_token/decode_token (HS256 JWT)

Alembic:
- backend/alembic.ini — sqlalchemy.url left blank, overridden in env.py
- backend/alembic/env.py — full async-aware migration env, imports ALL models, sets DATABASE_URL from settings
- backend/alembic/versions/*initial_schema*.py — initial migration including manual HNSW index: "CREATE INDEX IF NOT EXISTS idx_user_embeddings_hnsw ON user_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);"
- infra/scripts/init-db.sh — CREATE EXTENSION uuid-ossp; CREATE EXTENSION vector; create elyra_test DB with same extensions

Validation checks:
- SafetyEvent must use Python attr `event_metadata` with Column("metadata", JSONB) — NOT `metadata` (reserved by SQLAlchemy Base)
- All UUID primary keys use uuid4 default
- All FK CASCADE/SET NULL behaviors correctly specified
- pgvector Vector(384) dimension matches all-MiniLM-L6-v2

### PHASE 3 — Backend APIs
Verify these exist with complete implementations:

Schemas (backend/schemas/):
- auth.py — RegisterRequest (password strength validator: min 8 chars, 1 upper, 1 lower, 1 digit, 1 special), LoginRequest, TokenResponse, UserResponse, OAuthLoginRequest, ChangePasswordRequest, OTPRequest
- profile.py — PublicProfileUpdate, PrivateProfileUpdate, PublicProfileResponse, PrivateProfileResponse, PhotoUploadResponse
- preference.py — PreferenceUpdate, PreferenceResponse
- match.py — MatchCandidate (with compatibility_score, distance_km), MatchResponse, DiscoverResponse
- chat.py — ThreadResponse, MessageResponse
- safety.py — ReportCreate, BlockCreate, RiskScoreResponse, SafeSessionCreate (emergency_contact_phone E.164 validated), SafeSessionResponse, LocationUpdate, SOSTrigger
- payment.py — SubscriptionPlan, SubscribeRequest, PaymentWebhook, SubscriptionResponse
- notification.py — NotificationResponse, DeviceTokenCreate (platform enum), NotificationPreferences

Routes (backend/routes/):
- auth.py — 13 endpoints: register, login, refresh, logout, forgot-password, reset-password, me, email/send-verification, email/verify, phone/send-otp, phone/verify-otp, oauth/{provider}/login, change-password
- profile.py — 11 endpoints: me, me/public (PUT), me/private (PUT), me/photos (POST), me/photos/{index} (DELETE), me/preferences (GET/PUT), {user_id} (GET), {user_id}/reveal (POST/DELETE), {user_id}/private (GET)
- match.py — 6 endpoints: discover (GET), {user_id}/like (POST), {user_id}/pass (POST), list (GET), {match_id} (GET/DELETE)
- chat.py — 5 REST endpoints: threads (GET), threads/{id} (GET), threads/{id}/messages (GET), threads/{id}/read (POST), threads/{id} (PATCH)
- safety.py — 14 endpoints: reports (POST/GET), reports/{id} (PATCH), blocks (POST/GET), blocks/{user_id} (DELETE), risk-score/{user_id} (GET), safe-sessions (POST/GET), safe-sessions/active (GET), safe-sessions/{id}/check-in (PATCH), safe-sessions/{id}/location (POST), safe-sessions/{id}/end (POST), sos (POST)
- payment.py — 7 endpoints: plans, subscribe, subscription (GET), cancel, webhook, history, verify-badge
- notification.py — 9 endpoints: list, {id}/read, read-all, unread-count, {id} (DELETE), devices (POST/DELETE), preferences (GET/PUT)
- health.py — /health (no auth) and /health/detailed (admin) and /health/ready (readiness probe)

Services (backend/services/):
- auth_service.py — register() creates user + public_profile + user_preferences in transaction, publishes user.registered; login() handles brute-force lockout (5 failures → 15min lock); refresh() rotates tokens with Redis blacklist; logout() blacklists jti; forgot_password() always returns 200; oauth_login() upserts user; audit_logs every auth event
- profile_service.py — update_public_profile() calls moderation service for bio; update_private_profile() AES-256-GCM encrypts each field; upload_photo() validates magic bytes via Pillow, strips EXIF, resizes to ≤1600px, calls image service, uploads to S3, caps at 6 photos; reveal/revoke/view private with audit log
- matching_service.py — composite score: intent_match(0.30) + embedding_similarity(0.35) + distance_score(0.20) + preference_match(0.15); pgvector query with filters
- chat_service.py — MongoDB CRUD, idempotency via client_message_id, paginated message fetch
- trust_safety_service.py — risk score formula: report_count(0.30) + upheld_ratio(0.25) + toxicity_avg(0.20) + account_age(0.10) + verification(0.15), clamped [0,1]
- safety_service.py — create_safe_session() with Celery missed-checkin task; check_in() reschedules; trigger_sos() sends Twilio SMS + push + SafetyEvent
- payment_service.py — tier logic, Razorpay client, webhook signature verification
- notification_service.py — create_notification(), register_device_token(), FCM/APNs via firebase-admin
- push_service.py — send_fcm(), send_apns() with invalid token deactivation
- email_service.py — aiosmtplib async SMTP for verification, reset, digest
- sms_service.py — Twilio wrapper for OTP and SOS alerts
- storage_service.py — boto3 S3 upload + presigned URL + soft-delete to deleted/ prefix

Core:
- backend/core/dependencies.py — get_current_user, get_current_active_user, require_role factory, require_verified_email, require_active_subscription
- backend/core/middleware.py — CORSMiddleware, RateLimitMiddleware (Redis sliding window, 100/min IP, 10/min auth, 60/min user, returns 429 + Retry-After), SecurityHeadersMiddleware (X-Content-Type-Options, X-Frame-Options, HSTS, CSP), RequestIdMiddleware (X-Request-ID), MetricsMiddleware
- backend/core/events.py — EventPublisher class with publish() method
- backend/core/storage.py — boto3 S3 client wrapper
- backend/core/logging.py — structlog JSON config, masks PII (email, phone)
- backend/core/metrics.py — prometheus-fastapi-instrumentator + custom counters/histograms
- backend/workers/celery_app.py — Celery factory with Redis broker and result backend
- backend/workers/tasks.py — regenerate_embedding, score_new_profile, recompute_risk, missed_checkin_handler, subscription_expiry

### PHASE 4 — AI Services
Verify all four AI microservices under ai-services/:

embedding-service/:
- main.py — FastAPI with POST /embed (returns 384-dim list[float]), POST /similarity (cosine), GET /health
- model.py — EmbeddingModel wrapping SentenceTransformer('all-MiniLM-L6-v2'), normalize_embeddings=True
- schemas.py — EmbedRequest (text, optional user_id), EmbedResponse (embedding, dimension, model), SimilarityRequest/Response
- requirements.txt — fastapi, uvicorn[standard], sentence-transformers, torch, numpy, pydantic
- Dockerfile — pre-downloads model during build: RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')" — EXPOSE 9001

moderation-service/:
- main.py — POST /moderate/text, POST /moderate/batch, GET /health
- classifier.py — ToxicityClassifier with Detoxify + keyword blocklist; threshold_flag=0.5, threshold_block=0.8; returns per-category scores (harassment, hate, sexual, threat, profanity, self_harm); action logic
- blocklist.py — curated slur/spam/phishing patterns list
- schemas.py — TextModerationRequest (text, context Literal, user_id), TextModerationResponse (is_toxic, toxicity_score, categories, action Literal)
- requirements.txt — fastapi, uvicorn[standard], detoxify, torch, pydantic, numpy
- Dockerfile — pre-downloads Detoxify('original') — EXPOSE 9002

image-service/:
- main.py — POST /verify/face (stub returns verified=True, confidence=0.95), POST /moderate/image (stub returns is_safe=True), GET /health
- schemas.py — FaceVerifyRequest/Response, ImageModerationRequest/Response
- requirements.txt — fastapi, uvicorn[standard], pydantic, pillow, httpx
- Dockerfile — EXPOSE 9003

fake-profile-service/:
- main.py — POST /score, GET /health
- detector.py — FakeProfileDetector heuristics: photo_count==0 (+0.30), bio<20 chars (+0.15), account_age<1 day (+0.10), disposable email (+0.20), max embedding similarity>0.95 (+0.40), spam regex (+0.25); score clipped [0,1]; action: >=0.7 block, >=0.4 review, else allow
- schemas.py — FakeProfileRequest (user_id, bio, embedding, photo_count, account_age_days, email_domain, phone_country, neighbor_embeddings), FakeProfileResponse (fake_probability, factors, action)
- requirements.txt — fastapi, uvicorn[standard], pydantic, numpy
- Dockerfile — EXPOSE 9004

Backend integration:
- backend/core/ai_client.py — AIClient class with generate_embedding(), moderate_text(), moderate_image(), verify_face(), score_fake_profile(); circuit breaker (5 failures → safe default + Sentry WARN); timeouts (5s text, 15s image); exponential backoff (0.5→1→2s)
- backend/core/llm_client.py — LLMClient with provider='openai'|'local', complete(), chat(); Redis cache 1h; safety system prompt; LGBTQIA+-affirming language enforcement

### PHASE 5 — Chat System
- backend/websocket/__init__.py
- backend/websocket/manager.py — socketio.AsyncServer with AsyncRedisManager; connect() authenticates JWT, rate-limits (10/min), stores Redis presence keys (ws_sessions HASH, ws_user:{uid} SET, online:{uid} STRING 60s TTL), joins thread rooms, delivers offline_queue; disconnect() cleans up presence, emits user_offline; heartbeat() refreshes TTL
- backend/websocket/handlers.py — handle_send_message: auth→rate-limit (30/min sliding window)→validate (1-2000 chars, message_type enum, image=S3 URL ownership check, location=valid lat/lng)→participant check→thread.is_active check→block check→idempotency (client_message_id MongoDB lookup)→anonymous transform→insert MongoDB→update ChatThread.last_message_at→emit new_message→async moderation task→offline push notification; typing_start/stop handlers; mark_read; get_online_status
- backend/websocket/anonymous.py — AnonymousMessageFilter; Redis key anon_map:{thread_id}:{user_id} → "anon_1"/"anon_2"; blocks image sharing; strips location metadata
- backend/websocket/auth.py — JWT verify helper for socket connect
- backend/websocket/rate_limit.py — per-user sliding-window limiter using Redis ZADD/ZREMRANGEBYSCORE
- backend/websocket/presence.py — online_users helpers + heartbeat

Socket.io configuration:
- maxHttpBufferSize=64KB
- cors_allowed_origins from settings.CORS_ORIGINS
- Redis adapter for horizontal scaling
- Image upload NOT allowed via WS (REST only)
- Token expiry: server sends token_expiring event 60s before exp

MongoDB indexes created on startup:
- (thread_id, created_at) compound
- sender_id
- (thread_id, read_by) compound

### PHASE 6 — Frontend
Verify Next.js 14 App Router pages:

Pages (frontend/src/app/):
- layout.tsx — root layout (Inter + Outfit fonts, providers, Sentry, PWA meta, generateMetadata)
- page.tsx — landing: hero "Find Your Connection, Safely", "Pehchaan Layer" reference, feature cards (Dual Identity, AI Safety, Intent Matching, Privacy-first), CTA buttons, stats, footer
- globals.css — CSS custom properties (all brand colors), Tailwind imports, shimmer animation
- error.tsx — global error boundary
- not-found.tsx — 404 page
- loading.tsx — default skeleton
- (auth)/layout.tsx — centered minimal auth layout
- (auth)/login/page.tsx — email + password form, forgot password link, animated gradient background, calls /api/v1/auth/login
- (auth)/register/page.tsx — 4-step form with framer-motion transitions, progress indicator: Step1(email/password/confirm), Step2(display_name/age/gender_identity/sexual_orientation/pronouns, age≥18 validated), Step3(intent selection: exploring/serious/discreet/friendship), Step4(preferred_genders multi-select, age range slider, max distance slider)
- (auth)/verify-email/page.tsx
- (auth)/forgot-password/page.tsx
- (auth)/reset-password/page.tsx
- (main)/layout.tsx — sidebar + bottom mobile nav
- (main)/discover/page.tsx — Tinder-style swipe stack, framer-motion drag, like/pass/super-like actions, "It's a Match!" overlay with confetti, empty state
- (main)/matches/page.tsx — grid with filter tabs (All/New/Mutual)
- (main)/chat/page.tsx — thread list sorted by last_message_at, online indicator, unread badge, search bar
- (main)/chat/[threadId]/page.tsx — message bubbles (sent=right/purple, received=left/gray), moderated=blurred with flag indicator, typing dots animation, read receipts (double-check), infinite scroll, socket.io connect on mount/disconnect on unmount
- (main)/profile/page.tsx — photo carousel, public section, private section collapsed by default
- (main)/profile/edit/page.tsx — public + private forms, photo management (upload/reorder/delete up to 6), sliders
- (main)/profile/[userId]/page.tsx
- (main)/settings/page.tsx — account, privacy, notifications, subscription sections
- (main)/safety/page.tsx — SafeDate setup form + active session dashboard (timer, Check In button, SOS button large red, map) + history
- (main)/notifications/page.tsx
- (premium)/subscription/page.tsx — 4 plan cards (Free/Plus ₹499/Premium ₹999/Elite ₹1999), monthly/yearly toggle, FAQ accordion

Components (frontend/src/components/):
- ui/Button.tsx — variants: primary, secondary, outline, danger, ghost + loading state
- ui/Input.tsx — text/email/password with validation states and icons
- ui/Card.tsx — elevated with hover
- ui/Badge.tsx — intent badges (exploring=blue, serious=purple, discreet=gray, friendship=green)
- ui/Avatar.tsx — circular with online indicator dot
- ui/Modal.tsx — animated with backdrop blur, role="dialog", aria-modal, focus trap
- ui/Slider.tsx — range slider
- ui/Toggle.tsx — switch toggle
- ui/Tabs.tsx — tab navigation
- ui/Toast.tsx — react-hot-toast wrapper
- ui/Skeleton.tsx — shimmer loading placeholders
- ui/EmptyState.tsx — illustrated empty states
- auth/LoginForm.tsx, RegisterForm.tsx, StepIndicator.tsx, OAuthButtons.tsx, OtpInput.tsx
- profile/ProfileCard.tsx, ProfileForm.tsx, PhotoUploader.tsx, PreferenceForm.tsx, RevealButton.tsx, PrivateRevealModal.tsx
- matching/SwipeCard.tsx, SwipeStack.tsx, MatchOverlay.tsx, MatchGrid.tsx
- chat/ThreadList.tsx, ThreadItem.tsx, MessageBubble.tsx, ChatInput.tsx, TypingIndicator.tsx, ReadReceipt.tsx, AnonymousBadge.tsx
- safety/SafeSessionForm.tsx, SOSButton.tsx, CheckInTimer.tsx, LocationMap.tsx (react-leaflet)
- layout/Navbar.tsx, Sidebar.tsx, MobileNav.tsx, Footer.tsx

State management (frontend/src/stores/):
- authStore.ts — user, accessToken, isAuthenticated, isLoading; login(), register(), logout(), refreshToken(), fetchCurrentUser()
- chatStore.ts — threads, activeThread, messages Record<threadId, Message[]>, typingUsers Record<threadId, string[]>, onlineUsers Set<string>, unreadCounts; setActiveThread(), addMessage(), setTyping(), markRead()
- matchStore.ts — candidates, matches, isLoading; fetchCandidates(), likeUser(), passUser(), fetchMatches()
- profileStore.ts — publicProfile, privateProfile, preferences; fetchProfile(), updatePublicProfile(), updatePreferences()
- notificationStore.ts
- safetyStore.ts

Libraries (frontend/src/lib/):
- api.ts — Axios instance with base URL from NEXT_PUBLIC_API_URL; request interceptor attaches Bearer token from authStore; response interceptor: on 401 calls refreshToken() then retries original request once
- socket.ts — socket.io client with JWT auth param, transports: ['websocket','polling'], reconnection with exponential backoff (1s→5s max), registers all server event handlers that update chatStore
- auth.ts — token storage helpers (httpOnly cookie preferred or memory), auth check utilities
- utils.ts — formatDate, formatDistance, cn() className utility
- sentry.ts — Sentry.init helper

Hooks:
- hooks/useSocket.ts — returns socket instance, connects on auth, disconnects on logout
- hooks/useAuth.ts — returns auth state from store

Types (frontend/src/types/index.ts) — TypeScript interfaces matching all backend Pydantic schemas: User, PublicProfile, PrivateProfile, UserPreference, Match, MatchCandidate, ChatThread, Message, Notification, SafeSession, Subscription, Payment

Middleware (frontend/src/middleware.ts) — protects (main)/* routes (redirect to /login if no token), redirects authenticated users from (auth)/* to /discover, handles locale detection

i18n (frontend/src/i18n/):
- config.ts — next-intl config for en + hi locales
- locales/en.json — all user-facing strings
- locales/hi.json — Hindi translations
- All UI strings use useTranslations() from next-intl
- NEXT_LOCALE cookie persistence

Accessibility requirements:
- All img tags have alt
- Icon-only buttons have aria-label
- Modals: role="dialog", aria-modal="true", focus trap
- Toasts: aria-live
- Forms: aria-invalid + aria-describedby on errors
- Skip-to-content link in main layout
- prefers-reduced-motion respected (disables swipe spring physics)
- WCAG 2.1 AA color contrast

PWA:
- public/manifest.json — name "Elyra", short_name "Elyra", theme_color "#7C3AED", icons 192+512
- Service worker caches static assets + offline fallback page
- next-pwa configured in next.config.js (production only)

SEO:
- generateMetadata() per route
- public/robots.txt — allows /, /login, /register; disallows /chat/, /profile/, /settings/
- public/sitemap.xml — landing + auth pages
- public/og-default.png

Mobile scaffold (app/mobile/):
- package.json — expo, react-native, @react-navigation/native, @react-navigation/stack, react-native-mmkv
- app.json — Expo config name "Elyra"
- App.tsx — NavigationContainer + auth-conditional stack
- src/screens/LoginScreen.tsx, DiscoverScreen.tsx, ChatScreen.tsx — stubs
- src/lib/api.ts, src/stores/authStore.ts — same patterns as web
- README.md — explicitly "scaffold only, not feature-complete"

### PHASE 7 — Integration
- backend/core/events.py — EventPublisher.publish(channel, event_type, data) + EventSubscriber with HANDLERS dict mapping all events to handler functions: user.registered→[send_email_verification, initial_embedding, score_new_profile], profile.updated→[update_embedding, score_profile], preferences.updated→[update_embedding], message.sent→[moderate_message], match.created→[create_chat_thread, match_notification], report.created→[risk_recalculation, moderator_alert], payment.completed→[activate_subscription, payment_notification], safety.sos→[sms_emergency_contact, moderator_alert], safety.checkin_missed→[sms_emergency_contact]
- backend/main.py — complete lifespan: connect PG + MongoDB + Redis, create MongoDB indexes, start EventSubscriber background task, verify AI service health, Sentry init, Prometheus mount
- frontend/.env.local.example — NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL, NEXT_PUBLIC_SENTRY_DSN
- frontend/next.config.js — API rewrites + socket.io rewrite + next-pwa + Sentry
- infra/scripts/seed_data.py — 10 test users (diverse genders/orientations/intents), public profiles with bios, preferences, 5 mutual matches, 3 chat threads with sample messages in MongoDB, 1 premium subscription, embeddings via embedding service
- infra/scripts/run-migrations.sh — pg_isready wait loop + alembic upgrade head + CREATE EXTENSION vector
- infra/scripts/smoke-test.sh — curl-based: health check → register → /auth/me → /matches/discover → WebSocket handshake
- backend/core/logging.py — structlog JSON with fields: timestamp, level, event, request_id, user_id, path, latency_ms, status_code; masks PII
- backend/core/metrics.py — custom Prometheus metrics: elyra_messages_sent_total, elyra_match_score_histogram, elyra_ai_call_latency_seconds, elyra_ws_connections_active, elyra_safety_event_total, elyra_subscription_total
- infra/monitoring/prometheus.yml — scrape configs for backend :8000/metrics, all AI services
- infra/monitoring/grafana-dashboard.json — starter dashboard with latency, error rate, WS connections, AI call panels

### PHASE 8 — Deployment Configs
- app/backend/Dockerfile — python:3.11-slim, gcc+libpq-dev, non-root appuser, HEALTHCHECK (httpx GET /api/v1/health), CMD uvicorn with 4 workers
- app/frontend/Dockerfile — multi-stage: node:20-alpine builder (npm ci + npm run build) → runner (nextjs system user, .next/standalone + static), HEALTHCHECK wget, CMD node server.js
- app/infra/nginx/Dockerfile — nginx:1.25-alpine
- app/infra/nginx/nginx.conf — upstream backend:8000 + frontend:3000; limit_req_zone (api: 100r/m, auth: 10r/m); /api/ → backend with burst 20; /api/v1/auth/ → backend with burst 5; /socket.io/ → WebSocket upgrade with proxy_read_timeout 86400; / → frontend; /_next/webpack-hmr → WS upgrade; all proxy_set_header Host/X-Real-IP/X-Forwarded-For/X-Forwarded-Proto
- app/ai-services/*/Dockerfile — each with correct port exposure (9001-9004)
- app/docker-compose.yml — services: postgres (pgvector/pgvector:pg16 image, healthcheck pg_isready), redis (redis:7-alpine, appendonly yes), mongodb (mongo:7, mongosh ping healthcheck), minio + minio-init (bucket creation), backend (env_file, depends_on healthy DBs, --reload in dev), celery-worker, celery-beat, frontend (volume mount + npm run dev), embedding-service, moderation-service, image-service, fake-profile-service, nginx, prometheus + grafana (profiles: [observability]); all volumes defined
- app/docker-compose.test.yml — isolated test stack for CI
- app/.env.example — canonical complete template
- app/infra/k8s/namespace.yaml — namespace elyra
- app/infra/k8s/backend-deployment.yaml — Deployment (3 replicas), Service (ClusterIP 8000), HPA (min 2 / max 10, CPU 70% + memory 75%)
- app/infra/k8s/celery-deployment.yaml — worker (2 replicas, no service) + beat (1 replica, Recreate strategy)
- app/infra/k8s/frontend-deployment.yaml — 2 replicas + ClusterIP service
- app/infra/k8s/postgres-deployment.yaml — StatefulSet with pgvector image, PVC 20Gi, resources (500m/1Gi req, 2000m/4Gi limit)
- app/infra/k8s/redis-deployment.yaml — Deployment + PVC
- app/infra/k8s/mongodb-deployment.yaml — StatefulSet + PVC
- app/infra/k8s/ai-services-deployment.yaml — all 4 AI services with ClusterIP services
- app/infra/k8s/nginx-ingress.yaml — Ingress host elyra.app, TLS cert-manager letsencrypt-prod, WS annotations, paths: /api→backend, /socket.io→backend, /→frontend
- app/infra/k8s/secrets.yaml — placeholder base64 values for POSTGRES_PASSWORD, JWT_SECRET_KEY, AES_ENCRYPTION_KEY, REDIS_URL
- app/infra/k8s/configmap.yaml — all non-secret env vars
- app/infra/k8s/network-policy.yaml — default-deny ingress + targeted allows (backend←nginx, ai-services←backend, postgres/redis/mongo←backend+workers)
- app/infra/k8s/backup-cronjob.yaml — nightly 02:00 UTC pg_dump + mongodump to S3
- app/infra/scripts/init-db.sh — uuid-ossp + vector extensions, elyra_test DB creation
- app/infra/scripts/run-migrations.sh — pg_isready loop + alembic
- app/.github/workflows/ci.yml — jobs: lint-backend (ruff+mypy), lint-frontend (eslint+tsc --noEmit), test-backend (postgres/redis/mongo services + pytest --cov), test-frontend (playwright --reporter=list), build-images (docker buildx → GHCR on main/tag), deploy-staging (kubectl apply on main), deploy-prod (manual approval)
- app/.gitignore — comprehensive
- app/.dockerignore — node_modules, .next, __pycache__, .env, *.pyc, dist

### PHASE 9 — Testing
Backend tests (backend/tests/):
- conftest.py — engine fixture (session-scoped, creates+drops all tables), db_session (transaction rolled back after each test), client (AsyncClient + ASGITransport + get_db override), auth_headers (registers test user, returns Bearer header), second_user_headers
- pytest.ini — asyncio_mode=auto, markers: unit/api/websocket/integration/slow
- unit/test_security.py — TestPasswordHashing (hash, verify correct/wrong, not plaintext), TestJWT (create, decode, expired raises, invalid raises, correct expiry), TestEncryption (roundtrip, different plaintexts→different ciphertexts, wrong key fails, tampered ciphertext fails GCM auth)
- unit/test_matching.py — TestMatchScoring (intent exact/none, distance near/far, embedding high/low, composite in [0,1], preference factors), TestCandidateFiltering (blocked excluded, already-liked excluded, invisible excluded, age/distance/gender filters)
- unit/test_risk_scoring.py — new user low, many reports high, verified lower, high toxicity increases, clamped [0,1]
- unit/test_fake_profile.py — heuristic individual checks, combined score, action thresholds
- unit/test_anonymous_filter.py — identity hidden, consistent anon_id, image blocked, location stripped
- unit/test_schemas.py — RegisterRequest valid/invalid (email, weak password, age<18, invalid intent), profile schemas, preferences (age_min>age_max rejected)
- api/test_auth.py — registration success/duplicate/weak-password/profile-created, login success/wrong-password/nonexistent/returns-tokens, refresh success/invalid/rotates, me authenticated/unauthenticated, logout invalidates
- api/test_profiles.py — get/update public, view other/404, private update encrypted/reveal-403/reveal-then-view/revoke-then-403, preferences get/update, photo upload/delete
- api/test_matches.py — discover returns/excludes-blocked/pagination, like/pass/mutual-creates-match/blocked-fails, list matches, unmatch
- api/test_safety.py — create report/self-fails/duplicate, block/unblock/self-fails/hidden-from-discover, safe-session create/check-in/SOS
- api/test_payments.py — list plans, create/cancel/get subscription, webhook success/invalid-signature
- api/test_notifications.py — list/read/read-all/unread-count/delete, device token register/unregister, preferences get/update
- websocket/test_chat_ws.py — connect valid/invalid token rejected, send/receive message, typing, read receipt, stored in MongoDB, moderated flagged, anonymous hides identity
- integration/test_registration_flow.py — register→profile created→embedding generated (check user_embeddings)→discover returns candidates; verify all records (users+public_profiles+user_preferences) created
- integration/test_matching_flow.py — user A likes B (no match)→B likes A (match created)→Match record exists→ChatThread created→notifications sent; like→unmatch→thread deactivated
- integration/test_moderation_flow.py — create match+thread→send toxic WS message→moderation called→message marked→result stored
- integration/test_safe_date_flow.py — create session→check-in→SOS→SafetyEvent created→SMS called
- integration/test_payment_flow.py — subscribe→webhook→subscription active→user role upgraded
- ai/test_embedding.py — returns 384 dims, similar texts high similarity, different texts low, empty handled, health endpoint
- ai/test_moderation.py — clean allowed, toxic flagged, severely toxic blocked, batch, health
- ai/test_fake_profile.py — heuristic detection accuracy
- security/test_rate_limiting.py — 11th login attempt → 429; 31st WS message → rate_limited error
- security/test_authz.py — user role cannot hit moderator endpoints; cross-user private profile 403; expired token rejected; revoked refresh rejected
- security/test_input_validation.py — SQLi in bio field, XSS in display_name, 10MB payload → 413, path traversal in photo filename
- security/test_encryption.py — update private profile→read raw LargeBinary→plaintext NOT present→decrypt matches original→tamper byte→decrypt raises

Frontend E2E (frontend/e2e/):
- playwright.config.ts — testDir e2e, fullyParallel, retries CI=2, baseURL localhost:3000, trace retain-on-failure, projects: Desktop Chrome + Pixel 7 mobile
- auth.spec.ts — register fresh email, login, logout, password reset round-trip
- discover.spec.ts — swipe stack renders, simulate like, mutual match overlay appears (multi-context)
- chat.spec.ts — open thread, type message, appears in second browser context for matched user
- safety.spec.ts — create safe session, click SOS, assert toast + SafetyEvent via API
- a11y.spec.ts — axe-core on landing/login/discover/chat/safety, assert no critical violations

Load tests (tests/load/):
- locustfile.py — ElyraUser with register on_start, discover task(3), like_random task(1), open_profile task(2), wait_time between(1,3); targets: median <200ms at 200 users for /discover, p95 <500ms
- README.md — locust run instructions

app/docker-compose.test.yml — isolated test stack (postgres/redis/mongo on alternate ports)

---

## VALIDATION & REMEDIATION PROCEDURE

Execute in this order:

### STEP 1: Discovery
find /home/kaarthikeya/Elyra-main/graphify-out -type f | sort > /tmp/existing_files.txt
cat /tmp/existing_files.txt
Then compare against every file in the checklists above. Note every missing file.

### STEP 2: Lint Check — Backend
cd /home/kaarthikeya/Elyra-main/graphify-out/app/backend
pip install ruff mypy --quiet
ruff check . --output-format=concise 2>&1 | head -100
mypy . --ignore-missing-imports --no-error-summary 2>&1 | head -100
Fix all ruff errors. Fix all mypy errors where feasible (add type: ignore with comment only as last resort).

### STEP 3: Lint Check — Frontend
cd /home/kaarthikeya/Elyra-main/graphify-out/app/frontend
npm install --silent
npx tsc --noEmit 2>&1 | head -100
npx eslint src/ --max-warnings 0 2>&1 | head -100
Fix all TypeScript and ESLint errors.

### STEP 4: Content Validation
For each existing file, read its content and verify:
- Does it implement EXACTLY what the plan specifies?
- Are all required fields, methods, endpoints, and logic present?
- Are there any placeholder/stub implementations where full implementation is required?
- Are there any import errors or missing dependencies?

Key things to check:
- backend/models/safety.py: SafetyEvent MUST use `event_metadata` as Python attr with Column("metadata", JSONB) — NOT `metadata`
- backend/alembic/versions/*: MUST contain manual HNSW index SQL
- backend/core/security.py: AES-256-GCM must use random nonce per encryption call and store nonce+ciphertext+tag together
- backend/websocket/handlers.py: handle_send_message must implement ALL 14 steps in order
- frontend/src/lib/api.ts: 401 interceptor must refresh token then retry original request
- frontend/src/app/(auth)/register/page.tsx: Must have all 4 steps with correct field names and age≥18 validation
- docker-compose.yml: postgres service MUST use pgvector/pgvector:pg16 image (NOT postgres:16-alpine) to have pgvector pre-installed

### STEP 5: Gap Remediation
For every missing file identified in Step 1, create it with complete implementation (not stubs unless the plan explicitly says stub). For every incorrect implementation found in Step 4, fix it.

Priority order for fixes:
1. Core infrastructure (config, database connections, security)
2. Models and migrations
3. Backend services and routes
4. AI service integrations
5. WebSocket system
6. Frontend state and API client
7. Frontend pages and components
8. Tests
9. Deployment configs

### STEP 6: Re-lint
After all fixes, re-run ruff, mypy, tsc, and eslint to confirm zero errors.

### STEP 7: Import Chain Verification
cd /home/kaarthikeya/Elyra-main/graphify-out/app/backend
python -c "from main import app; print('Backend imports OK')"

cd /home/kaarthikeya/Elyra-main/graphify-out/app/frontend
npx tsc --noEmit && echo 'Frontend types OK'

### STEP 8: Final Report
After all remediation, output a structured report:
VALIDATION REPORT
Files Added (missing from codebase)

[list each file created]

Files Modified (incorrect implementation fixed)

[list each file fixed with brief description of what was wrong]

Lint Status

Backend ruff: PASS / FAIL (N errors)
Backend mypy: PASS / FAIL (N errors)
Frontend tsc: PASS / FAIL (N errors)
Frontend eslint: PASS / FAIL (N errors)

Critical Issues Found & Fixed

[list any critical bugs, security issues, or architectural mismatches]

Known Remaining Issues (if any)

[only list items that cannot be fixed without external dependencies/credentials]


---

## CONSTRAINTS & RULES

1. Never delete existing files — only modify or supplement them
2. When implementing services that call external APIs (Twilio, Firebase, Razorpay, OpenAI), the code must be correct but gracefully handle missing credentials (raise clear errors or skip in dev mode)
3. The embedding service MUST download the model during Docker build — do not skip this
4. All async functions in the backend must use proper async/await — no sync blocking calls
5. All database operations must use the async session/client — never sync SQLAlchemy calls
6. The SafetyEvent metadata column naming issue (event_metadata attr → "metadata" column) is a CRITICAL bug — fix everywhere it appears
7. Celery tasks must handle all exceptions and log failures — never let tasks crash silently
8. The matching algorithm composite score weights MUST sum to exactly 1.0 (0.30 + 0.35 + 0.20 + 0.15 = 1.0)
9. Token rotation on refresh: old refresh token jti must be blacklisted in Redis BEFORE new tokens are issued
10. Photo upload must strip EXIF data (use Pillow) BEFORE calling the image service and BEFORE S3 upload
11. Private profile fields must NEVER appear in logs — mask everything in logging middleware
12. The smoke-test.sh must actually run all 5 checks and exit with non-zero code on any failure
13. All Kubernetes manifests must pass kubectl apply --dry-run=client validation
14. The frontend API interceptor must prevent infinite retry loops on refresh failure (max 1 retry)
15. Socket.io connect must reject with ConnectionRefusedError (not just return) for banned/inactive users

Begin now. Work systematically through all 9 phases. Take your time and be thorough.