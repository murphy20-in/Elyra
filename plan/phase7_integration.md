# Phase 7: Integration

> **Goal**: Wire together all services — backend, frontend, AI services, databases, and WebSocket — ensuring end-to-end data flow works for all user journeys. Resolve cross-service dependencies and verify the complete system works as a unit.

---

## 7.1 Integration Points Map

```
Frontend (Next.js)
    │
    ├── REST API calls ──────► Backend (FastAPI)
    │                              │
    │                              ├── SQLAlchemy ──────► PostgreSQL
    │                              ├── Motor ───────────► MongoDB
    │                              ├── aioredis ────────► Redis
    │                              ├── httpx ───────────► Embedding Service
    │                              ├── httpx ───────────► Moderation Service
    │                              └── httpx ───────────► Image Service
    │
    └── WebSocket (socket.io) ──► Chat Handler
                                      ├── MongoDB (store messages)
                                      ├── Redis Pub/Sub (broadcast)
                                      └── Moderation Service (check)
```

---

## 7.2 End-to-End User Journeys to Verify

### Journey 1: Registration → Profile → Discovery
```
1. Frontend: User fills registration form (4 steps)
2. POST /api/v1/auth/register → Auth Service
3. Auth Service: create user → create public_profile → return tokens
4. Event: user.registered → Embedding Service generates initial embedding
5. Frontend: stores tokens, redirects to /discover
6. GET /api/v1/matches/discover → Matching Service
7. Matching Service: query pgvector → compute scores → return candidates
8. Frontend: renders swipe card stack
```

### Journey 2: Like → Match → Chat
```
1. Frontend: User swipes right (likes)
2. POST /api/v1/matches/{user_id}/like → Matching Service
3. Matching Service: check if mutual → if yes, create Match + ChatThread
4. Event: match.created → Notification Service
5. Frontend: "It's a Match!" overlay → navigate to chat
6. WebSocket: connect to socket.io with JWT
7. User sends message → handler stores in MongoDB → broadcasts
8. Moderation Service: check toxicity → update message if needed
9. Frontend: receives message via WebSocket → renders bubble
```

### Journey 3: Safe Date Flow
```
1. Frontend: User creates safe session (/safety)
2. POST /api/v1/safety/safe-session → creates SafeSession record
3. Timer starts for check-in interval
4. On check-in: PATCH /api/v1/safety/safe-session/{id}/check-in
5. On missed check-in: system creates SafetyEvent → notify emergency contact
6. On SOS: POST /api/v1/safety/sos → immediate notification to emergency contact
```

### Journey 4: Profile Reveal
```
1. User A views User B's public profile
2. GET /api/v1/profiles/{user_b_id} → returns public data only
3. User A requests to reveal private profile → UI option
4. User B grants access: POST /api/v1/profiles/{user_a_id}/reveal
5. User A views private profile: GET /api/v1/profiles/{user_b_id}/private
6. Backend: check user_a in reveal_to → decrypt fields → return
```

### Journey 5: Payment → Subscription
```
1. Frontend: User views subscription plans
2. GET /api/v1/payments/plans → returns tier details
3. User selects plan: POST /api/v1/payments/subscribe
4. Payment gateway callback: POST /api/v1/payments/webhook
5. Backend: update subscription status → update user role → notify
6. Frontend: refreshes user data → premium features unlocked
```

---

## 7.3 Cross-Service Configuration

### Backend → Frontend Connection
```typescript
// frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost/api/v1
NEXT_PUBLIC_WS_URL=http://localhost
```

### Backend → AI Services Connection
```python
# backend/.env
EMBEDDING_SERVICE_URL=http://embedding-service:9001
MODERATION_SERVICE_URL=http://moderation-service:9002
IMAGE_SERVICE_URL=http://image-service:9003
FAKE_PROFILE_SERVICE_URL=http://fake-profile-service:9004
```

### NGINX Proxy Configuration
```nginx
# Ensures frontend ↔ backend communication works via single origin
# Handles WebSocket upgrade for socket.io
# Routes /api/* to backend, /* to frontend
# Sets proper headers: X-Real-IP, X-Forwarded-For, X-Forwarded-Proto

location /socket.io/ {
    proxy_pass http://backend:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

## 7.4 Event System Wiring

### Redis Event Publisher (`core/events.py`)
```python
class EventPublisher:
    def __init__(self, redis_client):
        self.redis = redis_client

    async def publish(self, channel: str, event_type: str, data: dict):
        payload = json.dumps({
            "event": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        })
        await self.redis.publish(channel, payload)
```

### Event Subscriber (Background Worker)
```python
class EventSubscriber:
    """
    Runs as background task in FastAPI startup.
    Subscribes to Redis channels and routes events to handlers.
    """
    HANDLERS = {
        "user.registered":     [handle_send_email_verification, handle_initial_embedding, handle_score_new_profile],
        "profile.updated":     [handle_update_embedding, handle_score_profile],
        "preferences.updated": [handle_update_embedding],
        "message.sent":        [handle_moderate_message],
        "match.created":       [handle_create_chat_thread, handle_match_notification],
        "report.created":      [handle_risk_recalculation, handle_moderator_alert],
        "payment.completed":   [handle_activate_subscription, handle_payment_notification],
        "safety.sos":          [handle_sms_emergency_contact, handle_moderator_alert],
        "safety.checkin_missed": [handle_sms_emergency_contact],
    }

    async def start(self):
        pubsub = self.redis.pubsub()
        await pubsub.subscribe("elyra:events")
        async for message in pubsub.listen():
            if message["type"] == "message":
                event = json.loads(message["data"])
                handlers = self.HANDLERS.get(event["event"], [])
                for handler in handlers:
                    asyncio.create_task(handler(event["data"]))
```

---

## 7.5 CORS and Proxy Setup

### Backend CORS Configuration
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Next.js Proxy (for development without NGINX)
```javascript
// next.config.js
module.exports = {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:8000/api/:path*' },
      { source: '/socket.io/:path*', destination: 'http://localhost:8000/socket.io/:path*' },
    ];
  },
};
```

---

## 7.6 Startup Sequence

### Docker Compose Startup Order
```yaml
# docker-compose.yml service dependencies
services:
  postgres:     # Starts first (no dependencies)
  redis:        # Starts first (no dependencies)
  mongodb:      # Starts first (no dependencies)
  backend:
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
      mongodb: { condition: service_healthy }
  embedding-service:  # No DB dependencies
  moderation-service: # No DB dependencies
  image-service:      # No DB dependencies
  frontend:
    depends_on: [backend]
  nginx:
    depends_on: [backend, frontend]
```

### Backend Startup Events
```python
@app.on_event("startup")
async def startup():
    # 1. Connect to PostgreSQL (create engine, run migrations if needed)
    # 2. Connect to MongoDB (create client, ensure indexes)
    # 3. Connect to Redis (create pool)
    # 4. Start event subscriber (background task)
    # 5. Verify AI service connectivity (health checks)
    # 6. Log startup complete

@app.on_event("shutdown")
async def shutdown():
    # 1. Close PostgreSQL engine
    # 2. Close MongoDB client
    # 3. Close Redis pool
    # 4. Stop event subscriber
```

---

## 7.7 Database Migration Strategy

```bash
# infra/scripts/run-migrations.sh

#!/bin/bash
set -e

echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER; do
  sleep 2
done

echo "Running Alembic migrations..."
cd /app/backend
alembic upgrade head

echo "Creating pgvector extension..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo "Migrations complete."
```

---

## 7.8 Seed Data Script

```python
# scripts/seed_data.py — Create test data for development

async def seed():
    """
    Creates:
    - 10 test users with varied profiles (diverse genders, orientations, intents)
    - Public profiles with bios and photos (placeholder URLs)
    - User preferences with varied filters
    - 5 mutual matches
    - 3 chat threads with sample messages (in MongoDB)
    - 1 subscription (premium user)
    - Embeddings for all users (via embedding service)
    """
```

---

## 7.9 Health Check Dashboard

### Backend Health Endpoint
```python
@router.get("/health")
async def health():
    """Liveness probe — always returns 200 if process is up."""
    return {"status": "ok"}

@router.get("/health/detailed")
async def detailed_health(user = Depends(require_role("admin"))):
    return {
        "status": "ok" if all_ok else "degraded",
        "services": {
            "postgresql":          await check_pg(),         # SELECT 1, time it
            "mongodb":             await check_mongo(),      # ping, time it
            "redis":               await check_redis(),      # PING, time it
            "embedding_service":   await check_ai("embedding"),
            "moderation_service":  await check_ai("moderation"),
            "image_service":       await check_ai("image"),
            "fake_profile_service":await check_ai("fake-profile"),
        },
        "uptime_seconds": get_uptime(),
        "version": settings.APP_VERSION,
        "git_sha": settings.GIT_SHA,                 # injected at build time
    }

@router.get("/health/ready")
async def readiness():
    """K8s readiness probe — fails when DB unreachable so traffic stops routing here."""
    if not await check_pg() or not await check_redis():
        raise HTTPException(503, "Not ready")
    return {"status": "ready"}
```

Each `check_X` returns:
```python
{"ok": True, "latency_ms": 4.2}   # or
{"ok": False, "error": "connection refused"}
```

---

## 7.9b Observability Stack

### Logging
- Library: `structlog` configured in `core/logging.py` to emit JSON to stdout.
- Fields: `timestamp`, `level`, `event`, `request_id`, `user_id` (when set), `path`, `latency_ms`, `status_code`.
- Loglevel from env `LOG_LEVEL` (default INFO; DEBUG in dev).
- Avoid logging PII: never log full email, phone, or any decrypted private profile field. Mask: `email="a**@example.com"`.

### Metrics
- `prometheus-fastapi-instrumentator` exposes `/metrics`.
- Custom counters/histograms:
  - `elyra_messages_sent_total{thread_id_hash, moderated}`
  - `elyra_match_score_histogram`
  - `elyra_ai_call_latency_seconds{service, endpoint}`
  - `elyra_ws_connections_active`
  - `elyra_safety_event_total{event_type}`
  - `elyra_subscription_total{tier, status}`

### Error tracking
- `sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1, environment=settings.APP_ENV)`.
- Frontend: `@sentry/nextjs` with same DSN and environment.
- WS errors caught in connect/disconnect/handlers and forwarded to Sentry with `extras={'sid': sid, 'user_id': user_id}`.

### Tracing (optional, scaffold)
- OpenTelemetry instrumentor for FastAPI + httpx + sqlalchemy + asyncpg.
- Span exported to OTLP collector if `OTEL_EXPORTER_OTLP_ENDPOINT` set.

---

## 7.10 Phase 7 File Checklist

| # | File | Contents |
|---|------|----------|
| 1 | `backend/core/events.py` | Complete `EventPublisher` + `EventSubscriber` (Redis pub/sub) |
| 2 | Update `backend/main.py` | FastAPI lifespan: connect DBs, start subscriber, MongoDB indexes, Sentry init, Prometheus mount |
| 3 | Update `infra/nginx/nginx.conf` | WebSocket proxy, sticky session note (not needed with Redis adapter), security headers |
| 4 | `frontend/.env.local.example` | API and WS URLs, Sentry DSN, locale default |
| 5 | Update `frontend/next.config.js` | API rewrites, PWA wrapping, Sentry plugin |
| 6 | `infra/scripts/seed_data.py` | Test data seeder (10 users, 5 matches, 3 chat threads, embeddings) |
| 7 | `infra/scripts/run-migrations.sh` | Migration runner with pg-isready wait loop |
| 8 | `infra/scripts/smoke-test.sh` | curl-based end-to-end smoke check (register → login → discover → like → ws connect) |
| 9 | Update all backend services | Wire event publishing for: user.registered, profile.updated, message.sent, match.created, report.created, payment.completed, safety_event |
| 10 | Update all frontend stores | Connect to actual API endpoints + socket events |
| 11 | `backend/core/logging.py` | structlog JSON config |
| 12 | `backend/core/metrics.py` | Prometheus instrumentator + custom metrics |
| 13 | `backend/core/sentry_init.py` | Sentry SDK init helper |
| 14 | `frontend/src/instrumentation.ts` | Sentry init for Next.js |
| 15 | `infra/monitoring/prometheus.yml` | scrape configs for backend + AI services |
| 16 | `infra/monitoring/grafana-dashboard.json` | starter dashboard (latency, error rate, WS conns, AI calls) |

---

*Phase 7 complete. Proceed to Phase 8: Deployment Configs.*
