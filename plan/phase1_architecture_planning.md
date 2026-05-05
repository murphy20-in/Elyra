# Phase 1: Architecture Planning

> **Goal**: Define the complete system architecture, confirm all modules, establish communication patterns, and scaffold the monorepo directory structure.

---

## 1.1 System Overview

Elyra is a privacy-first, AI-enabled LGBTQIA+ dating platform targeting India. The system follows a **microservices architecture** deployed via Docker Compose (dev) and Kubernetes (production), fronted by an NGINX API gateway.

### Core Features
| Feature | Description |
|---|---|
| Dual Identity | Public profile (visible) + Private profile (AES-256 encrypted, reveal-based) |
| Intent-Based Matching | Algorithmic matching on intent + preferences + vector embeddings |
| AI Trust & Safety | Fake profile detection, chat toxicity, risk scoring |
| Privacy-first Chat | Real-time WebSocket messaging with AI moderation |
| Safe Date | Emergency contact + live location sharing |
| Monetization | Subscription tiers, verification badge, premium privacy |

---

## 1.2 Tech Stack

### Backend
| Component | Technology | Purpose |
|---|---|---|
| API Framework | FastAPI (Python 3.11+) | Async REST + WebSocket APIs |
| Primary DB | PostgreSQL 16 + pgvector | Users, profiles, matches, embeddings |
| Cache / Pub-Sub | Redis 7 | Session cache, rate limiting, WS scaling |
| Chat Storage | MongoDB 7 | Message persistence |
| Task Queue | Celery + Redis broker | Async jobs |
| ORM | SQLAlchemy 2.0 (async) | PostgreSQL models |
| Migrations | Alembic | Schema version control |

### Frontend
| Component | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS 3 |
| State | Zustand |
| HTTP | Axios |
| WebSocket | socket.io-client |

### AI Layer
| Service | Technology | Purpose |
|---|---|---|
| Embedding Service | sentence-transformers (all-MiniLM-L6-v2, 384-dim) | Bio/preference vectorization |
| Moderation Service | Detoxify (open-source) + keyword blocklist; optional OpenAI moderation API hook | Chat & profile content toxicity |
| Image Service | Stub (placeholder CV) — nudity / face verification | Photo safety; replace with NudeNet / DeepFace later |
| Fake Profile Detector | Heuristic + embedding-anomaly scoring | Reduce fake/duplicate accounts (Phase 4) |

> **LLM Hook**: Backend exposes a thin `LLMClient` (`core/llm_client.py`) with pluggable providers — `openai` (default) and `local` (Ollama/llama.cpp). All LLM calls flow through this client so any future feature (smart match explanation, conversation starters) can use it without re-wiring.

### Mobile (Optional Scaffold)
| Component | Technology | Purpose |
|---|---|---|
| Mobile App | React Native 0.74 (Expo) | Future iOS/Android client (scaffold only in Phase 6) |
| Shared Types | TypeScript via `frontend/src/types` | Re-used between web & mobile |

### Infrastructure
| Component | Technology |
|---|---|
| Containerization | Docker + Docker Compose |
| Orchestration | Kubernetes (YAML manifests) |
| Gateway | NGINX (rate limiting, TLS termination, WS upgrade) |
| Object Storage | S3-compatible (MinIO in dev, AWS S3 / Cloudflare R2 in prod) for profile photos, ID documents, evidence URLs |
| Secrets | `.env` files (dev) / Kubernetes Secrets + sealed-secrets (prod) |
| Logging | structlog (JSON logs) + container stdout shipping to Loki/CloudWatch |
| Metrics | Prometheus client (`prometheus-fastapi-instrumentator`) + Grafana dashboards |
| Error Tracking | Sentry SDK in backend + frontend (`sentry-sdk`, `@sentry/nextjs`) |
| Background Jobs | Celery worker + beat (Redis broker) for: re-embedding, risk recompute, missed-checkin alerts, subscription expiry |

---

## 1.3 Microservices Architecture

### Service Definitions

| # | Service | Port | Responsibilities |
|---|---------|------|-----------------|
| 1 | API Gateway (NGINX) | 80/443 | Route, SSL, rate limit, CORS |
| 2 | Auth Service | 8001 | Registration, login, JWT, OAuth |
| 3 | Profile Service | 8002 | Public/private profiles, preferences, photos |
| 4 | Matching Service | 8003 | Intent-based matching, embedding similarity |
| 5 | Chat Service | 8004 | WebSocket messaging, thread management |
| 6 | Trust & Safety Service | 8005 | Reports, blocks, risk scoring |
| 7 | Payment Service | 8006 | Subscriptions, payments, badges |
| 8 | Notification Service | 8007 | Push, email, in-app notifications |

### AI Microservices (Internal)

| # | Service | Port |
|---|---------|------|
| 1 | Embedding Service | 9001 |
| 2 | Moderation Service | 9002 |
| 3 | Image Service | 9003 |

> **Design Decision**: All backend services run as a **single FastAPI app** with modular routers initially (monolith-first). Service ports above represent target architecture for future decomposition.

---

## 1.4 Inter-Service Communication

### Synchronous (HTTP/REST)
- Internal calls via Docker network using service hostnames
- JWT token forwarded for authenticated inter-service calls

### Asynchronous (Redis Pub/Sub + Celery)
| Event | Publisher | Subscriber(s) |
|-------|-----------|---------------|
| `user.registered` | Auth Service | Profile Service, Embedding Service |
| `profile.updated` | Profile Service | Embedding Service, Matching Service |
| `message.sent` | Chat Service | Moderation Service, Notification Service |
| `report.created` | Trust & Safety | Risk Scoring, Notification Service |
| `match.created` | Matching Service | Notification Service, Chat Service |
| `payment.completed` | Payment Service | Profile Service, Notification Service |

### WebSocket (Chat)
- Client ↔ Chat Service via socket.io
- Redis Pub/Sub for horizontal scaling

---

## 1.5 Data Flow Diagrams

### User Registration
```
Client → NGINX → Auth Service
    ├── Validate input (Pydantic)
    ├── Hash password (bcrypt)
    ├── Insert into PostgreSQL (users)
    ├── Generate JWT (access + refresh)
    ├── Publish: user.registered
    │     ├── Profile Service → create empty public_profile
    │     └── Embedding Service → awaits profile data
    └── Return tokens
```

### Matching Flow
```
Client → NGINX → Matching Service
    ├── Fetch user preferences
    ├── Query pgvector for similar embeddings
    ├── Filter by intent match + distance
    ├── Compute composite score
    ├── Return ranked candidates
    └── On mutual like → Publish match.created
```

### Chat Flow
```
Client ↔ WebSocket ↔ Chat Service
    ├── Authenticate JWT
    ├── Join room (thread_id)
    ├── On message:
    │    ├── Store in MongoDB
    │    ├── Publish to Redis (scaling)
    │    ├── Publish message.sent → Moderation
    │    └── Broadcast to room
    └── On disconnect: update presence
```

---

## 1.6 Security Architecture

| Layer | Implementation |
|-------|---------------|
| Authentication | JWT access (15min) + refresh (7day) tokens |
| Token Algorithm | HS256 (upgradeable to RS256) |
| Password Hashing | bcrypt |
| Private Profile Encryption | AES-256-GCM at application layer |
| Authorization | RBAC: user, premium_user, verified_user, moderator, admin |
| Rate Limiting | NGINX (100/min/IP) + Redis (60/min/user) |
| Input Validation | Pydantic schemas on ALL endpoints |
| SQL Injection Prevention | SQLAlchemy parameterized queries |
| Transport | TLS 1.3 via NGINX |

---

## 1.7 Monorepo Directory Structure

```
d:\Elyra\app\
├── README.md
├── docker-compose.yml
├── docker-compose.test.yml          # Isolated test stack (Phase 9)
├── .env.example
├── .gitignore
├── .dockerignore
├── backend/
│   ├── requirements.txt
│   ├── requirements-test.txt
│   ├── alembic.ini
│   ├── pytest.ini
│   ├── alembic/
│   │   ├── env.py                   # Async-aware migration env
│   │   └── versions/
│   ├── core/                        # config, database, mongodb, redis_client, security,
│   │                                # middleware, dependencies, events, ai_client,
│   │                                # llm_client, storage, logging, metrics
│   ├── models/                      # SQLAlchemy models (one file per domain)
│   ├── schemas/                     # Pydantic schemas (one file per domain)
│   ├── services/                    # Business logic layer
│   ├── routes/                      # FastAPI routers (one per service)
│   ├── websocket/                   # socket.io manager + handlers + anonymous filter
│   ├── workers/                     # Celery app + tasks (re-embed, risk, expiry, sos)
│   ├── tests/                       # unit / api / websocket / integration / ai (Phase 9)
│   ├── main.py                      # FastAPI entrypoint (mounts socket.io ASGI app)
│   └── Dockerfile
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── public/                      # icons, manifest.json, robots.txt
│   ├── src/
│   │   ├── app/                     # Next.js App Router pages
│   │   ├── components/              # ui, auth, profile, matching, chat, safety, layout
│   │   ├── lib/                     # api, socket, auth, sentry, utils
│   │   ├── stores/                  # Zustand stores
│   │   ├── hooks/                   # custom React hooks
│   │   ├── i18n/                    # locale dictionaries (en, hi)
│   │   ├── types/                   # TypeScript definitions
│   │   └── middleware.ts            # Next.js auth middleware
│   ├── e2e/                         # Playwright tests (Phase 9)
│   ├── playwright.config.ts
│   └── Dockerfile
├── mobile/                          # OPTIONAL React Native scaffold (Expo)
│   ├── package.json
│   ├── app.json
│   ├── App.tsx
│   ├── src/                         # screens, components, lib, stores
│   └── README.md                    # explicitly marked "scaffold only"
├── ai-services/
│   ├── embedding-service/           # Bio → 384-dim vector
│   ├── moderation-service/          # Toxicity classification
│   ├── image-service/               # Nudity / face stubs
│   └── fake-profile-service/        # Heuristic + embedding anomaly detector
├── infra/
│   ├── nginx/                       # nginx.conf + Dockerfile
│   ├── k8s/                         # Kubernetes manifests
│   ├── monitoring/                  # prometheus.yml, grafana dashboards
│   └── scripts/                     # init-db.sh, run-migrations.sh, seed-data.py, smoke-test.sh
└── scripts/                         # setup.sh, run-tests.sh, lint.sh, format.sh, build-all.sh
```

---

## 1.8 API Gateway Route Mapping

```
/api/v1/auth/*          → backend:8001
/api/v1/profiles/*      → backend:8002
/api/v1/matches/*       → backend:8003
/api/v1/chat/*          → backend:8004
/api/v1/safety/*        → backend:8005
/api/v1/payments/*      → backend:8006
/api/v1/notifications/* → backend:8007
/ws/*                   → backend:8004 (WebSocket upgrade)
/*                      → frontend:3000
```

---

## 1.9 Environment Variables

Create `.env.example` with the **complete** template. Phase 8 §8.6 contains the canonical list. Required groups:
- **App**: `APP_NAME`, `APP_ENV`, `APP_VERSION`, `SECRET_KEY`, `DEBUG`, `LOG_LEVEL`
- **PostgreSQL**: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `TEST_DATABASE_URL`
- **Redis**: `REDIS_HOST`, `REDIS_PORT`, `REDIS_URL`
- **MongoDB**: `MONGO_HOST`, `MONGO_PORT`, `MONGO_DB`, `MONGO_URL`
- **JWT**: `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`
- **Encryption**: `AES_ENCRYPTION_KEY` (32-byte hex)
- **AI Services**: `EMBEDDING_SERVICE_URL`, `MODERATION_SERVICE_URL`, `IMAGE_SERVICE_URL`, `FAKE_PROFILE_SERVICE_URL`
- **LLM (optional)**: `LLM_PROVIDER` (`openai` | `local`), `OPENAI_API_KEY`, `OPENAI_MODEL`, `LOCAL_LLM_URL`
- **CORS**: `CORS_ORIGINS` (comma-separated)
- **Rate Limiting**: `RATE_LIMIT_PER_MINUTE`, `AUTH_RATE_LIMIT_PER_MINUTE`, `WS_MESSAGE_RATE_LIMIT`
- **Storage**: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`, `MAX_PHOTO_SIZE_MB`
- **Email/SMS** (Phase 3 verification): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `TWILIO_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
- **Push Notifications**: `FCM_SERVER_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`
- **Payment Gateway**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- **Observability**: `SENTRY_DSN`, `PROMETHEUS_ENABLED`

---

## 1.10 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Monolith-first backend | All services as FastAPI routers in one app; split when scale demands |
| pgvector over Pinecone | Self-hosted, no vendor lock-in, integrated with PostgreSQL |
| socket.io over raw WS | Built-in rooms, auto-reconnect, polling fallback |
| Zustand over Redux | Simpler API, smaller bundle, sufficient for scale |
| Alembic for migrations | Industry standard for SQLAlchemy, supports async |
| AES-256-GCM | Authenticated encryption prevents reading and tampering |

---

## 1.11 Phase 1 Deliverables

| # | Deliverable | Path |
|---|-------------|------|
| 1 | Create all directories from §1.7 (use `mkdir -p`) | `app/**` |
| 2 | Root README.md (project overview, quickstart, architecture diagram) | `app/README.md` |
| 3 | .gitignore (Python, Node, env files, build artifacts, .next, __pycache__) | `app/.gitignore` |
| 4 | .dockerignore | `app/.dockerignore` |
| 5 | .env.example (complete from §1.9) | `app/.env.example` |
| 6 | Backend requirements.txt (production deps from §1.12) | `app/backend/requirements.txt` |
| 7 | Backend requirements-test.txt (test-only deps) | `app/backend/requirements-test.txt` |
| 8 | Backend `core/config.py` — Pydantic `Settings` class with all env vars | `app/backend/core/config.py` |
| 9 | Backend `main.py` stub — empty `FastAPI()` app + `/health` route | `app/backend/main.py` |
| 10 | Frontend package.json (deps from §1.13) | `app/frontend/package.json` |
| 11 | Frontend tsconfig.json + next.config.js + tailwind.config.ts | `app/frontend/*` |
| 12 | AI service requirement stubs (one per service) | `app/ai-services/*/requirements.txt` |
| 13 | NGINX config (stub — completed in Phase 8) | `app/infra/nginx/nginx.conf` |
| 14 | Docker Compose file (stub — completed in Phase 8) | `app/docker-compose.yml` |
| 15 | Mobile scaffold (Expo `package.json` + `App.tsx`) | `app/mobile/*` |
| 16 | All `__init__.py` files for every Python package | every dir under `backend/`, `ai-services/*` |
| 17 | `core/logging.py` stub — structlog configuration | `app/backend/core/logging.py` |
| 18 | `core/metrics.py` stub — Prometheus instrumentator | `app/backend/core/metrics.py` |

---

## 1.12 Backend Dependencies

```
# Web framework
fastapi==0.111.0
uvicorn[standard]==0.30.1
python-multipart==0.0.9

# Database
sqlalchemy[asyncio]==2.0.30
asyncpg==0.29.0
alembic==1.13.1
pgvector==0.3.2

# NoSQL & cache
motor==3.4.0
redis==5.0.7

# Validation & settings
pydantic==2.7.4
pydantic-settings==2.3.4
email-validator==2.1.1

# Auth & crypto
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
cryptography==42.0.8

# Tasks & queue
celery==5.4.0
celery[redis]==5.4.0

# HTTP & WebSocket
httpx==0.27.0
python-socketio==5.11.3

# Storage & media
boto3==1.34.131
pillow==10.3.0

# Observability
structlog==24.2.0
prometheus-fastapi-instrumentator==7.0.0
sentry-sdk[fastapi]==2.7.1

# Notifications
aiosmtplib==3.0.1
twilio==9.2.2
firebase-admin==6.5.0

# Payments
razorpay==1.4.2
```

## 1.13 Frontend Dependencies

```json
{
  "dependencies": {
    "next": "14.2.4",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "tailwindcss": "3.4.4",
    "zustand": "4.5.2",
    "axios": "1.7.2",
    "socket.io-client": "4.7.5",
    "framer-motion": "11.2.10",
    "@heroicons/react": "2.1.3",
    "lucide-react": "0.395.0",
    "react-hot-toast": "2.4.1",
    "date-fns": "3.6.0",
    "next-intl": "3.15.0",
    "@sentry/nextjs": "8.10.0",
    "next-pwa": "5.6.0",
    "react-leaflet": "4.2.1",
    "leaflet": "1.9.4"
  },
  "devDependencies": {
    "typescript": "5.4.5",
    "@types/node": "20.14.9",
    "@types/react": "18.3.3",
    "@playwright/test": "1.45.0",
    "eslint": "8.57.0",
    "eslint-config-next": "14.2.4"
  }
}
```

## 1.14 Mobile Scaffold (Optional)

The `mobile/` directory is **scaffold-only** in this plan (full implementation not required for v1):

```
mobile/
├── package.json          # expo, react-native, react-navigation
├── app.json              # Expo config
├── App.tsx               # Root component with NavigationContainer
├── README.md             # "Scaffold only — port frontend logic later"
└── src/
    ├── screens/          # placeholder screens (Login, Discover, Chat)
    ├── lib/              # api.ts, socket.ts (re-uses web logic patterns)
    └── stores/           # Zustand stores (cross-platform)
```
- Mobile dependencies (`expo`, `react-native`, `@react-navigation/native`, `@react-navigation/stack`, `react-native-mmkv`).
- README explicitly states: "This is a scaffold. Production-ready mobile build happens after web v1 ships."

---

## 1.15 Brand Positioning Notes

| Field | Value |
|---|---|
| Public brand | **Elyra** |
| Internal philosophy | **Pehchaan Layer** (identity layer in Hindi/Urdu) |
| Tagline | *"A safer way to connect, explore identity, and build real connections."* |
| Tone | Warm, inclusive, trust-first; never "dating-app" lingo in core copy |
| Region focus | India-first, English + Hindi locale support (Phase 6 §6.12) |

These values must be reflected in:
- README.md hero
- Frontend landing page (`src/app/page.tsx`)
- All `<title>` and Open Graph tags
- Email templates (verification, reset)

---

*Phase 1 complete. Proceed to Phase 2: Database Models + Migrations.*
