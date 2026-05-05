# Phase 8: Deployment Configs

> **Goal**: Create all Docker, Docker Compose, Kubernetes, and NGINX configurations needed to run the entire Elyra platform locally and in production.

---

## 8.1 Docker Strategy

### Container Registry
| Service | Image Name | Base Image |
|---------|-----------|------------|
| Backend | `elyra/backend` | `python:3.11-slim` |
| Frontend | `elyra/frontend` | `node:20-alpine` (build) + `node:20-alpine` (run) |
| Embedding Service | `elyra/embedding-service` | `python:3.11-slim` |
| Moderation Service | `elyra/moderation-service` | `python:3.11-slim` |
| Image Service | `elyra/image-service` | `python:3.11-slim` |
| NGINX | `elyra/nginx` | `nginx:1.25-alpine` |
| PostgreSQL | `postgres:16-alpine` | Official |
| Redis | `redis:7-alpine` | Official |
| MongoDB | `mongo:7` | Official |

---

## 8.2 Dockerfiles

### Backend Dockerfile (`app/backend/Dockerfile`)
```dockerfile
FROM python:3.11-slim AS base

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/api/v1/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Frontend Dockerfile (`app/frontend/Dockerfile`)
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["node", "server.js"]
```

### NGINX Dockerfile (`app/infra/nginx/Dockerfile`)
```dockerfile
FROM nginx:1.25-alpine
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 8.3 Docker Compose — Development (`docker-compose.yml`)

```yaml
version: '3.9'

services:
  # ─── Databases ───
  postgres:
    image: pgvector/pgvector:pg16          # pgvector pre-installed
    environment:
      POSTGRES_DB: elyra
      POSTGRES_USER: elyra_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-elyra_dev_pass}
    ports: ["5432:5432"]
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/scripts/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U elyra_user -d elyra"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: [redis_data:/data]
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  mongodb:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: [mongo_data:/data/db]
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── Local S3 (MinIO) ───
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9090"
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY:-minio_admin}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY:-minio_admin_pass}
    ports: ["9000:9000", "9090:9090"]
    volumes: [minio_data:/data]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      retries: 5

  minio-init:
    image: minio/mc:latest
    depends_on: [minio]
    entrypoint: >
      /bin/sh -c "
      sleep 5;
      mc alias set local http://minio:9000 ${S3_ACCESS_KEY:-minio_admin} ${S3_SECRET_KEY:-minio_admin_pass};
      mc mb -p local/${S3_BUCKET:-elyra};
      mc anonymous set download local/${S3_BUCKET:-elyra};
      exit 0;
      "

  # ─── Backend ───
  backend:
    build: ./backend
    env_file: .env
    ports: ["8000:8000"]
    volumes: ["./backend:/app"]    # Hot reload in dev
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
      mongodb: { condition: service_healthy }
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  celery-worker:
    build: ./backend
    env_file: .env
    volumes: ["./backend:/app"]
    depends_on: [backend, redis, postgres]
    command: celery -A workers.celery_app worker --loglevel=info

  celery-beat:
    build: ./backend
    env_file: .env
    volumes: ["./backend:/app"]
    depends_on: [redis]
    command: celery -A workers.celery_app beat --loglevel=info

  # ─── Frontend ───
  frontend:
    build: ./frontend
    env_file: ./frontend/.env.local
    ports: ["3000:3000"]
    volumes: ["./frontend:/app", "/app/node_modules"]
    depends_on: [backend]
    command: npm run dev

  # ─── AI Services ───
  embedding-service:
    build: ./ai-services/embedding-service
    ports: ["9001:9001"]
    command: uvicorn main:app --host 0.0.0.0 --port 9001

  moderation-service:
    build: ./ai-services/moderation-service
    ports: ["9002:9002"]
    command: uvicorn main:app --host 0.0.0.0 --port 9002

  image-service:
    build: ./ai-services/image-service
    ports: ["9003:9003"]
    command: uvicorn main:app --host 0.0.0.0 --port 9003

  fake-profile-service:
    build: ./ai-services/fake-profile-service
    ports: ["9004:9004"]
    command: uvicorn main:app --host 0.0.0.0 --port 9004

  # ─── Gateway ───
  nginx:
    build: ./infra/nginx
    ports: ["80:80"]
    depends_on: [backend, frontend]

  # ─── Observability (optional in dev) ───
  prometheus:
    image: prom/prometheus:latest
    ports: ["9091:9090"]
    volumes:
      - ./infra/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    profiles: [observability]

  grafana:
    image: grafana/grafana:latest
    ports: ["3001:3000"]
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    profiles: [observability]

volumes:
  postgres_data:
  redis_data:
  mongo_data:
  minio_data:
```

> Run `docker compose up` for the core stack; `docker compose --profile observability up` to also start Prometheus + Grafana.

---

## 8.4 NGINX Configuration (`infra/nginx/nginx.conf`)

```nginx
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }
    upstream frontend {
        server frontend:3000;
    }

    # Rate limiting zone
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

    server {
        listen 80;
        server_name localhost;

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Auth routes (stricter rate limit)
        location /api/v1/auth/ {
            limit_req zone=auth burst=5 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # WebSocket
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 86400;
        }

        # Frontend (catch-all)
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Next.js HMR WebSocket (development)
        location /_next/webpack-hmr {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
```

---

## 8.5 Kubernetes Manifests (`infra/k8s/`)

### Namespace (`namespace.yaml`)
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: elyra
```

### Backend Deployment (`backend-deployment.yaml`)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: elyra
spec:
  replicas: 3
  selector: { matchLabels: { app: backend } }
  template:
    metadata:
      labels: { app: backend }
    spec:
      containers:
        - name: backend
          image: ghcr.io/elyra/backend:latest
          ports: [{ containerPort: 8000 }]
          envFrom:
            - configMapRef: { name: elyra-config }
            - secretRef:    { name: elyra-secrets }
          resources:
            requests: { cpu: "250m", memory: "512Mi" }
            limits:   { cpu: "1000m", memory: "1Gi" }
          livenessProbe:
            httpGet: { path: /api/v1/health, port: 8000 }
            initialDelaySeconds: 20
            periodSeconds: 30
          readinessProbe:
            httpGet: { path: /api/v1/health/ready, port: 8000 }
            initialDelaySeconds: 10
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata: { name: backend-service, namespace: elyra }
spec:
  selector: { app: backend }
  ports: [{ port: 8000, targetPort: 8000 }]
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: backend-hpa, namespace: elyra }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: backend }
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
    - type: Resource
      resource: { name: memory, target: { type: Utilization, averageUtilization: 75 } }
```
- Plus a separate `Deployment` for `celery-worker` (replicas: 2, no service) and `celery-beat` (replicas: 1, single instance — use `strategy: type: Recreate`).

### Frontend Deployment (`frontend-deployment.yaml`)
```yaml
# Deployment: 2 replicas
# Service: ClusterIP on port 3000
```

### PostgreSQL StatefulSet (`postgres-deployment.yaml`)
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata: { name: postgres, namespace: elyra }
spec:
  serviceName: postgres-service
  replicas: 1
  selector: { matchLabels: { app: postgres } }
  template:
    metadata: { labels: { app: postgres } }
    spec:
      containers:
        - name: postgres
          image: pgvector/pgvector:pg16
          envFrom: [{ secretRef: { name: elyra-secrets } }]
          ports: [{ containerPort: 5432 }]
          volumeMounts:
            - { name: data, mountPath: /var/lib/postgresql/data }
          resources:
            requests: { cpu: "500m", memory: "1Gi" }
            limits:   { cpu: "2000m", memory: "4Gi" }
  volumeClaimTemplates:
    - metadata: { name: data }
      spec:
        accessModes: [ReadWriteOnce]
        storageClassName: standard
        resources: { requests: { storage: 20Gi } }
```
- Production: use a managed PostgreSQL (AWS RDS, GCP Cloud SQL, Neon) with pgvector enabled and point `DATABASE_URL` to it; the StatefulSet above is a fallback.

### Redis Deployment (`redis-deployment.yaml`)
```yaml
# Deployment: 1 replica, PVC for persistence
# Service: ClusterIP on port 6379
```

### MongoDB Deployment (`mongodb-deployment.yaml`)
```yaml
# StatefulSet: 1 replica, PVC for data
# Service: ClusterIP on port 27017
```

### AI Services (`ai-services-deployment.yaml`)
```yaml
# Embedding Service: 2 replicas (GPU-optional)
# Moderation Service: 2 replicas
# Image Service: 1 replica
# Each with ClusterIP services on their respective ports
```

### NGINX Ingress (`nginx-ingress.yaml`)
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: elyra-ingress
  namespace: elyra
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/websocket-services: "backend-service"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
    - hosts: [elyra.app]
      secretName: elyra-tls
  rules:
    - host: elyra.app
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service: { name: backend-service, port: { number: 8000 } }
          - path: /socket.io
            pathType: Prefix
            backend:
              service: { name: backend-service, port: { number: 8000 } }
          - path: /
            pathType: Prefix
            backend:
              service: { name: frontend-service, port: { number: 3000 } }
```

### Secrets (`secrets.yaml`)
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: elyra-secrets
  namespace: elyra
type: Opaque
data:
  # Base64 encoded values (use kubectl create secret in practice)
  POSTGRES_PASSWORD: <base64>
  JWT_SECRET_KEY: <base64>
  AES_ENCRYPTION_KEY: <base64>
  REDIS_URL: <base64>
```

### ConfigMap (`configmap.yaml`)
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: elyra-config
  namespace: elyra
data:
  APP_NAME: Elyra
  APP_ENV: production
  DEBUG: "false"
  POSTGRES_HOST: postgres-service
  POSTGRES_PORT: "5432"
  POSTGRES_DB: elyra
  REDIS_HOST: redis-service
  MONGO_HOST: mongodb-service
  EMBEDDING_SERVICE_URL: http://embedding-service:9001
  MODERATION_SERVICE_URL: http://moderation-service:9002
  IMAGE_SERVICE_URL: http://image-service:9003
```

---

## 8.6 Environment Variable Template (`.env.example`)

```env
# ═══ Application ═══
APP_NAME=Elyra
APP_ENV=development
DEBUG=true
SECRET_KEY=change-me-to-random-256-bit-key

# ═══ PostgreSQL ═══
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=elyra
POSTGRES_USER=elyra_user
POSTGRES_PASSWORD=elyra_dev_pass
DATABASE_URL=postgresql+asyncpg://elyra_user:elyra_dev_pass@postgres:5432/elyra

# ═══ Redis ═══
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379/0

# ═══ MongoDB ═══
MONGO_HOST=mongodb
MONGO_PORT=27017
MONGO_DB=elyra_chat
MONGO_URL=mongodb://mongodb:27017/elyra_chat

# ═══ JWT ═══
JWT_SECRET_KEY=change-me-to-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# ═══ Encryption ═══
AES_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef

# ═══ AI Services ═══
EMBEDDING_SERVICE_URL=http://embedding-service:9001
MODERATION_SERVICE_URL=http://moderation-service:9002
IMAGE_SERVICE_URL=http://image-service:9003

# ═══ CORS ═══
CORS_ORIGINS=http://localhost:3000,http://localhost:80

# ═══ Rate Limiting ═══
RATE_LIMIT_PER_MINUTE=100
AUTH_RATE_LIMIT_PER_MINUTE=10
```

---

## 8.6b Backup & Disaster Recovery

| Resource | Strategy |
|---|---|
| PostgreSQL | Daily logical backups (`pg_dump`) shipped to S3 (encrypted with KMS); WAL streaming to standby for prod. Retention: 30 days. |
| MongoDB | Daily `mongodump` to S3, encrypted; retention 30 days. |
| Redis | RDB snapshots + AOF (already configured in `docker-compose.yml`); not required for restore — Redis is cache + transient queue. |
| S3 (photos) | Versioning + lifecycle (move to Glacier after 90 days, expire `deleted/*` after 30). |
| Restore drill | Quarterly. Documented in `infra/docs/disaster-recovery.md`. |

A `CronJob` manifest `infra/k8s/backup-cronjob.yaml` runs `pg_dump` and uploads to S3 nightly at 02:00 UTC.

---

## 8.6c Network Policies

Default-deny ingress in the `elyra` namespace, then explicit allowlists:

```yaml
# infra/k8s/network-policy.yaml — DEFAULT DENY + selective allow
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny, namespace: elyra }
spec:
  podSelector: {}
  policyTypes: [Ingress]
---
# Backend may receive from NGINX ingress
# AI services may only receive from backend pods (label app=backend)
# Postgres / Redis / Mongo may only receive from backend + workers
```

---

## 8.6d CI/CD Pipeline

Add `.github/workflows/ci.yml`:
- Triggers: PR to `main`, push to `main`.
- Jobs:
  1. **lint-backend** — ruff + mypy
  2. **lint-frontend** — eslint + tsc --noEmit
  3. **test-backend** — spin up postgres+redis+mongo services, run `pytest --cov`
  4. **test-frontend** — `next lint && playwright test --reporter=list` (if E2E enabled)
  5. **build-images** — `docker buildx` for backend, frontend, ai-services on tag/push to main; push to GHCR
  6. **deploy-staging** (push to main) — `kubectl apply -k infra/k8s/overlays/staging`
  7. **deploy-prod** (manual approval) — `kubectl apply -k infra/k8s/overlays/prod`

`infra/k8s/` should be Kustomize-style with `base/` + `overlays/{staging,prod}` if multi-env is needed.

---

## 8.6e TLS / SSL

- Production uses cert-manager + Let's Encrypt (`ClusterIssuer: letsencrypt-prod`) — already referenced in `nginx-ingress.yaml`.
- Local dev: HTTP only (NGINX listens on port 80).
- HSTS header (`Strict-Transport-Security: max-age=31536000`) added by `SecurityHeadersMiddleware` in production.

---

## 8.7 Init Scripts

### Database Init (`infra/scripts/init-db.sh`)
```bash
#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS vector;
    -- Create test database for pytest (only in dev)
    SELECT 'CREATE DATABASE elyra_test'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'elyra_test')\gexec
EOSQL
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "elyra_test" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS vector;
EOSQL
```

---

## 8.8 Phase 8 File Checklist

| # | File | Contents |
|---|------|----------|
| 1 | `app/backend/Dockerfile` | Backend container (multi-stage, non-root user, healthcheck) |
| 2 | `app/frontend/Dockerfile` | Multi-stage frontend container (Next standalone output) |
| 3 | `app/ai-services/embedding-service/Dockerfile` | Embedding container (port 9001) |
| 4 | `app/ai-services/moderation-service/Dockerfile` | Moderation container (port 9002) |
| 5 | `app/ai-services/image-service/Dockerfile` | Image service container (port 9003) |
| 6 | `app/ai-services/fake-profile-service/Dockerfile` | Fake-profile container (port 9004) |
| 7 | `app/infra/nginx/Dockerfile` | NGINX container |
| 8 | `app/infra/nginx/nginx.conf` | Complete NGINX config (security headers, WS, rate limits) |
| 9 | `app/docker-compose.yml` | Development compose (incl. MinIO, Celery, observability profile) |
| 10 | `app/docker-compose.test.yml` | Isolated test stack (Phase 9) |
| 11 | `app/.env.example` | Environment template (canonical) |
| 12 | `app/infra/k8s/namespace.yaml` | K8s namespace |
| 13 | `app/infra/k8s/backend-deployment.yaml` | Backend Deployment + Service + HPA |
| 14 | `app/infra/k8s/celery-deployment.yaml` | Celery worker + beat |
| 15 | `app/infra/k8s/frontend-deployment.yaml` | Frontend Deployment + Service |
| 16 | `app/infra/k8s/postgres-deployment.yaml` | PostgreSQL StatefulSet (pgvector image) |
| 17 | `app/infra/k8s/redis-deployment.yaml` | Redis Deployment + PVC |
| 18 | `app/infra/k8s/mongodb-deployment.yaml` | MongoDB StatefulSet |
| 19 | `app/infra/k8s/ai-services-deployment.yaml` | All four AI services |
| 20 | `app/infra/k8s/nginx-ingress.yaml` | Ingress with cert-manager + WS |
| 21 | `app/infra/k8s/secrets.yaml` | K8s secrets template (placeholder values) |
| 22 | `app/infra/k8s/configmap.yaml` | K8s configmap |
| 23 | `app/infra/k8s/network-policy.yaml` | Default-deny + targeted allows |
| 24 | `app/infra/k8s/backup-cronjob.yaml` | Nightly pg_dump + mongodump to S3 |
| 25 | `app/infra/scripts/init-db.sh` | DB init (incl. test DB) |
| 26 | `app/infra/scripts/run-migrations.sh` | Alembic runner |
| 27 | `app/infra/scripts/smoke-test.sh` | E2E smoke check (Phase 7 §7.10) |
| 28 | `app/infra/monitoring/prometheus.yml` | Prometheus scrape config |
| 29 | `app/infra/monitoring/grafana-dashboard.json` | Starter dashboard |
| 30 | `app/.github/workflows/ci.yml` | CI pipeline (lint, test, build, deploy) |
| 31 | `app/.gitignore` | Git ignore rules |
| 32 | `app/.dockerignore` | Docker ignore rules |

---

*Phase 8 complete. Proceed to Phase 9: Testing.*
