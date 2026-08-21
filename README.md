# Elyra

**A privacy-first, AI-enabled LGBTQIA+ dating platform built for India.**

Elyra is designed around the *Pehchaan Layer* philosophy — letting users express their authentic identity while keeping full control over their personal information. It combines a dual-identity profile system, intent-based AI matching, real-time moderated chat, and a comprehensive trust & safety layer in a single deployable platform.

---

## Table of Contents

1. [Features](#features)
2. [Repository Layout](#repository-layout)
3. [Architecture](#architecture)
4. [Technology Stack](#technology-stack)
5. [Quickstart](#quickstart)
6. [Services & Ports](#services--ports)
7. [Testing](#testing)
8. [Documentation Map](#documentation-map)
9. [Security Highlights](#security-highlights)

---

## Features

| Feature | Description |
|---------|-------------|
| **Dual Identity System** | Public profile (safe, visible) + private profile (AES-256-GCM encrypted at rest, reveal-based access) |
| **Intent-Based Matching** | Users declare intent — exploring, serious, discreet, friendship. Scoring combines embedding similarity (35%), intent match (30%), distance (20%), preference alignment (15%) via pgvector HNSW index |
| **AI Trust & Safety Layer** | Fake-profile detection (Isolation Forest + heuristics), chat toxicity moderation (Detoxify + blocklists), risk scoring from reports and behavior |
| **Privacy-First Chat** | Real-time Socket.IO messaging persisted in MongoDB, Redis pub/sub for horizontal scaling, optional anonymous mode with mutual identity reveal |
| **Safe Date** | Safe sessions with check-in reminders, emergency SOS that shares live location with trusted contacts via SMS |
| **Monetization** | Subscription tiers, paid verification badge, premium privacy controls via Razorpay |

---

## Repository Layout

This repository is a project workspace containing the full product lifecycle — spec, plan, implementation, audits, and pitch materials.

```
Elyra-main/
├── codebase/               # ★ The production application (see codebase/README.md)
│   ├── app/                #   Main deployable unit
│   │   ├── backend/        #     FastAPI service (routes, services, models, websocket, workers, tests)
│   │   ├── frontend/       #     Next.js 14 web app (App Router, Tailwind, Zustand)
│   │   ├── mobile/         #     React Native (Expo) scaffold
│   │   ├── ai-services/    #     4 ML microservices (embedding, moderation, image, fake-profile)
│   │   ├── infra/          #     Nginx, K8s manifests, monitoring configs
│   │   └── docker-compose.yml
│   ├── infra/              #   K8s base/overlays, nginx gateway, DR docs
│   ├── tests/load/         #   Locust load tests
│   └── cmd.md              #   Full command reference
├── basecodebase/           # Static landing-page prototype (vanilla HTML/CSS/JS)
├── plan/                   # 9-phase execution plans (architecture → testing)
├── audit/                  # Audit prompts + per-phase audit reports and final comprehensive report
├── POC/                    # Pitch decks (PPTX/PDF), pitch scripts, interactive HTML POC iterations
├── skills/                 # "FRONTEND DEV" skill library (coding standards, TDD, security review, etc.)
├── PrimaryPrompt.md        # Original product specification / build prompt
├── graphify-out/           # Codebase knowledge graph artifacts (GRAPH_REPORT.md)
└── AGENTS.md               # Instructions for AI coding agents working in this repo
```

---

## Architecture

Microservice-oriented design deployed as a unified Docker Compose stack (Kubernetes-ready):

```
 Browser / Mobile
        │
        ▼
     Nginx (:80)  ── TLS termination, rate limiting
        │
        ├────────────► Frontend  Next.js (:3000)
        │
        ▼
 Backend API  FastAPI (:8000)  ── JWT auth, RBAC, rate limiting
        │
        ├── Socket.IO WebSocket server (chat, presence, typing)
        ├── Celery workers + beat (async tasks)
        │
        ▼
 ┌─────────────┬─────────┬──────────┬─────────────┐
 │ PostgreSQL  │  Redis  │ MongoDB  │ MinIO (S3)  │
 │ 16+pgvector │   7     │    7     │             │
 └─────────────┴─────────┴──────────┴─────────────┘
        │
        ▼
 AI microservices: embedding :9001 · moderation :9002 · image :9003 · fake-profile :9004
```

### Backend modules (`codebase/app/backend`)

- `routes/` — auth, profiles, matches, chat, safety, payments, notifications, health
- `services/` — business logic (auth, matching, profile, chat, trust & safety, payment, email/SMS/push, storage)
- `models/` + `alembic/` — SQLAlchemy 2.0 async models and migrations (14 tables incl. `user_embeddings vector(384)`)
- `websocket/` — Socket.IO handlers, JWT socket auth, presence, rate limits, anonymous identity mapping
- `workers/` — Celery app and background tasks
- `tests/` — unit, api, integration, security, websocket, ai suites

---

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| Backend | Python 3.11+, FastAPI, uvicorn + uvloop, SQLAlchemy 2.0 (async), Pydantic v2, Celery, python-jose, passlib/bcrypt |
| Data | PostgreSQL 16 + pgvector, Redis 7, MongoDB 7, MinIO/S3 |
| Real-time | Socket.IO (python-socketio server, redis message queue) |
| Frontend | Next.js 14, React 18, Tailwind CSS 3, Zustand, axios, framer-motion |
| Mobile | React Native / Expo (scaffold) |
| AI/ML | sentence-transformers `all-MiniLM-L6-v2` (384-dim embeddings), Detoxify toxicity classifier, scikit-learn Isolation Forest, OpenAI-compatible LLM client (provider-pluggable) |
| Infra | Docker Compose, Kubernetes manifests (kustomize base/overlays), Nginx, Prometheus + Grafana, Sentry |
| Testing | pytest (+ respx-mocked AI tests), Playwright e2e, Locust load tests |

---

## Quickstart

Prerequisites: **Docker & Docker Compose**, (optional native dev: Python 3.11+, Node.js 20+).

```bash
cd codebase/app

# 1. Configure environment
cp .env.example .env
# Edit .env — set at minimum:
#   SECRET_KEY, JWT_SECRET_KEY, AES_ENCRYPTION_KEY (32-byte key),
#   POSTGRES_PASSWORD

# 2. Start the full stack
docker compose up -d --build

# 3. Run database migrations
docker compose exec backend alembic upgrade head
```

Then open:

| URL | What |
|-----|------|
| http://localhost:3000 | Web frontend |
| http://localhost:8000/docs | Swagger UI (interactive API docs) |
| http://localhost:9099 | MinIO console |
| http://localhost:9090 / :3001 | Prometheus / Grafana (`--profile observability`) |

Smoke test:

```bash
curl http://localhost:8000/api/v1/health/liveness
```

> Full command reference (run/test/db/k8s/debug): [`codebase/cmd.md`](codebase/cmd.md)

---

## Services & Ports

| Service | Port | Purpose |
|---------|------|---------|
| Nginx gateway | 80 | Reverse proxy entrypoint |
| Frontend (Next.js) | 3000 | Web application |
| Backend (FastAPI) | 8000 | REST API + Socket.IO |
| PostgreSQL + pgvector | 5432 | Primary relational data + vector search |
| Redis | 6379 | Cache, sessions, rate limiting, pub/sub, presence |
| MongoDB | 27017 | Chat message store |
| MinIO | 9000 / 9099 | Media object storage / console |
| Embedding service | 9001 | Text → 384-dim vectors |
| Moderation service | 9002 | Text toxicity classification |
| Image service | 9003 | Image moderation (stub / CV placeholder) |
| Fake-profile service | 9004 | Registration risk scoring |
| Celery worker / beat | — | Background jobs & schedules |
| Prometheus / Grafana | 9090 / 3001 | Observability (compose profile: `observability`) |

---

## Testing

```bash
cd codebase/app

# Full backend suite (26 test files across 6 suites)
docker compose exec backend pytest -v

# By suite
docker compose exec backend pytest app/backend/tests/unit        -v
docker compose exec backend pytest app/backend/tests/api         -v
docker compose exec backend pytest app/backend/tests/integration -v
docker compose exec backend pytest app/backend/tests/security    -v   # RBAC, SQLi/XSS, cross-user isolation, rate limits
docker compose exec backend pytest app/backend/tests/websocket   -v
docker compose exec backend pytest app/backend/tests/ai          -v   # respx-mocked AI clients

# Coverage
docker compose exec backend pytest --cov=app.backend --cov-report=html

# Load testing (Locust)
docker compose -f ../docker-compose.test.yml up -d
```

Frontend e2e tests live in `codebase/app/frontend/e2e/` (Playwright).

---

## Documentation Map

| Path | Contents |
|------|----------|
| [`codebase/README.md`](codebase/README.md) | Deep-dive: architecture, data flows, DB schema, full API reference, env vars, deployment |
| [`codebase/app/README.md`](codebase/app/README.md) | App-level quickstart and service table |
| [`codebase/cmd.md`](codebase/cmd.md) | Every build/run/test/debug/deploy command |
| [`plan/phase1…phase9*.md`](plan/) | Execution plans per build phase (architecture, DB, APIs, AI, chat, frontend, integration, deployment, testing) |
| [`audit/reports/`](audit/reports/) | Per-phase audit reports + `FINAL_COMPREHENSIVE_AUDIT_REPORT.md` |
| [`POC/PitchDeck/`](POC/PitchDeck/) | Pitch deck, demo script, summary; `POC/PPT/` has generated PPTX/PDF decks |
| [`PrimaryPrompt.md`](PrimaryPrompt.md) | Original product requirements & mandatory spec |
| [`graphify-out/GRAPH_REPORT.md`](graphify-out/GRAPH_REPORT.md) | Knowledge-graph analysis of the codebase (god nodes, communities) |

---

## Security Highlights

- **JWT authentication** — short-lived access tokens (15 min) + rotating refresh tokens (7 days); separate socket-auth flow
- **Field-level encryption** — private profile fields encrypted with AES-256-GCM (random 96-bit nonce per operation)
- **Password hashing** — bcrypt (work factor 12), constant-time verification
- **RBAC** — user / moderator / admin roles enforced across routes
- **Rate limiting** — per-user/IP sliding windows on API and WebSocket messages (Redis-backed)
- **Defense in depth** — security headers middleware, request-ID tracing, input validation everywhere, account lockout, audit logging
- **Safety systems** — reporting, blocking, risk scoring, safe-session check-ins, SOS with location sharing

---

*Status: feature-complete reference implementation developed through a phased build-and-audit process (see `plan/` and `audit/`). Image-moderation CV models are placeholders; LLM provider keys are optional.*
