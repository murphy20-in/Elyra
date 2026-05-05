# Elyra Command Reference

This file contains all commands needed to build, run, test, debug, and manage the Elyra codebase.

---

## Table of Contents

1. [Quick Reference](#1-quick-reference)
2. [Setup Commands](#2-setup-commands)
3. [Run Commands](#3-run-commands)
4. [Testing Commands](#4-testing-commands)
5. [Database Commands](#5-database-commands)
6. [Docker Commands](#6-docker-commands)
7. [Kubernetes Commands](#7-kubernetes-commands)
8. [AI Service Commands](#8-ai-service-commands)
9. [Development Utilities](#9-development-utilities)
10. [Build Commands](#10-build-commands)
11. [Deployment Commands](#11-deployment-commands)
12. [Troubleshooting Commands](#12-troubleshooting-commands)

---

## 1. Quick Reference

### Environment Variables Required

```bash
# Minimum required for local development
export SECRET_KEY="your-secret-key-min-32-chars-long-here"
export JWT_SECRET_KEY="jwt-secret-key-min-32-chars"
export AES_ENCRYPTION_KEY="32-byte-base64-encoded-key"
export POSTGRES_PASSWORD="elyra_dev_pass"
export MONGO_PASSWORD="elyra_dev_pass"
export S3_ACCESS_KEY="minioadmin"
export S3_SECRET_KEY="minioadmin"
```

### Service URLs

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost |
| Backend API | 8000 | http://localhost:8000 |
| API Docs | 8000 | http://localhost:8000/docs |
| PostgreSQL | 5432 | postgresql://localhost:5432 |
| Redis | 6379 | redis://localhost:6379 |
| MongoDB | 27017 | mongodb://localhost:27017 |
| MinIO API | 9000 | http://localhost:9000 |
| MinIO Console | 9090 | http://localhost:9090 |
| Embedding Service | 9001 | http://localhost:9001 |
| Moderation Service | 9002 | http://localhost:9002 |
| Image Service | 9003 | http://localhost:9003 |
| Fake Profile Service | 9004 | http://localhost:9004 |

### Quick Start

```bash
# Full system startup (all services)
cd /home/kaarthikeya/Elyra-main/codebase
cp app/.env.example app/.env
docker-compose up -d

# Verify all running
docker-compose ps

# Check backend health
curl http://localhost:8000/api/v1/health/liveness
```

---

## 2. Setup Commands

### 2.1 Clone and Initial Setup

```bash
# Clone repository
git clone https://github.com/elyra-platform/elyra.git
cd elyra/codebase

# Verify directory structure
ls -la
```

### 2.2 Environment Configuration

```bash
# Copy example environment file
cp app/.env.example app/.env

# Edit with your values (minimum required)
cat > app/.env << 'EOF'
APP_NAME=Elyra
APP_ENV=development
SECRET_KEY=your-secret-key-at-least-32-characters-long
JWT_SECRET_KEY=jwt-secret-key-at-least-32-characters-long
AES_ENCRYPTION_KEY=32-byte-base64-encoded-key-here==
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=elyra_db
POSTGRES_USER=elyra_user
POSTGRES_PASSWORD=elyra_dev_pass
REDIS_HOST=redis
REDIS_PORT=6379
MONGO_HOST=mongodb
MONGO_PORT=27017
MONGO_DB=elyra_chat
MONGO_USER=elyra_user
MONGO_PASSWORD=elyra_dev_pass
S3_ENDPOINT_URL=http://minio:9000
S3_BUCKET=elyra-uploads
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
EMBEDDING_SERVICE_URL=http://embedding-service:9001
MODERATION_SERVICE_URL=http://moderation-service:9002
IMAGE_SERVICE_URL=http://image-service:9003
FAKE_PROFILE_SERVICE_URL=http://fake-profile-service:9004
EOF
```

### 2.3 Python Backend Setup

```bash
# Create Python virtual environment
cd /home/kaarthikeya/Elyra-main/codebase/app/backend
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "import fastapi; print('FastAPI installed:', fastapi.__version__)"
```

### 2.4 Frontend Setup

```bash
# Navigate to frontend
cd /home/kaarthikeya/Elyra-main/codebase/app/frontend

# Install Node.js dependencies
npm install

# Verify installation
npm list --depth=0
```

### 2.5 Database Setup (No Docker)

```bash
# PostgreSQL with pgvector (macOS)
brew install postgresql@16
brew services start postgresql@16
# Create database
createdb elyra_db -U postgres
psql elyra_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Redis (macOS)
brew install redis
brew services start redis

# MongoDB (macOS)
brew install mongodb-community
brew services start mongodb-community

# MinIO (macOS)
brew install minio/stable/minio
minio server /data --console-address ":9090"
```

---

## 3. Run Commands

### 3.1 Full System (Docker Compose)

```bash
# Navigate to codebase root
cd /home/kaarthikeya/Elyra-main/codebase

# Start all services
docker-compose up -d

# View running services
docker-compose ps

# View logs for all services
docker-compose logs -f

# Stop all services
docker-compose down
```

### 3.2 Backend Only

```bash
# Using Docker
docker-compose up -d backend

# Or directly (requires PostgreSQL, Redis, MongoDB running)
cd /home/kaarthikeya/Elyra-main/codebase/app/backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# With custom settings
uvicorn main:app --host 0.0.0.0 --port 8000 --reload --log-level debug

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 3.3 Frontend Only

```bash
# Using Docker
docker-compose up -d frontend

# Or directly (requires backend running)
cd /home/kaarthikeya/Elyra-main/codebase/app/frontend
npm run dev

# Build for production
npm run build
npm run start
```

### 3.4 AI Services Only

```bash
# Start all AI services
docker-compose up -d embedding-service moderation-service image-service fake-profile-service

# Or individually
docker-compose up -d embedding-service
docker-compose up -d moderation-service
docker-compose up -d image-service
docker-compose up -d fake-profile-service
```

### 3.5 Database Services Only

```bash
# Start only databases
docker-compose up -d postgres redis mongodb minio

# Start with initialization
docker-compose up -d postgres redis mongodb minio minio-init
```

### 3.6 Celery Workers

```bash
# Start Celery worker
docker-compose up -d celery-worker

# Start Celery beat (scheduler)
docker-compose up -d celery-beat

# Start both
docker-compose up -d celery-worker celery-beat

# Or run directly
cd /home/kaarthikeya/Elyra-main/codebase/app/backend
celery -A workers.celery_app worker --loglevel=info --concurrency=2
celery -A workers.celery_app beat --loglevel=info
```

### 3.7 WebSocket Server

```bash
# WebSocket runs embedded in backend
# Access via http://localhost:8000
# Socket.IO endpoint: /socket.io

# Test WebSocket connection
curl -X GET http://localhost:8000/socket.io/
```

### 3.8 Monitoring Stack

```bash
# Start with observability
docker-compose --profile observability up -d prometheus grafana

# Access Prometheus
curl http://localhost:9091

# Access Grafana (admin/admin)
open http://localhost:3001
```

---

## 4. Testing Commands

### 4.1 Backend Tests

```bash
# Run all tests
docker-compose exec backend pytest -v

# Run specific test type
docker-compose exec backend pytest app/backend/tests/unit -v
docker-compose exec backend pytest app/backend/tests/api -v
docker-compose exec backend pytest app/backend/tests/integration -v
docker-compose exec backend pytest app/backend/tests/security -v
docker-compose exec backend pytest app/backend/tests/websocket -v

# Run specific test file
docker-compose exec backend pytest app/backend/tests/unit/test_matching.py -v

# Run specific test
docker-compose exec backend pytest app/backend/tests/unit/test_matching.py::test_match_score -v

# Run with coverage
docker-compose exec backend pytest --cov=app.backend --cov-report=html

# Run tests matching pattern
docker-compose exec backend pytest -k "test_match" -v
```

### 4.2 Frontend Tests

```bash
# Run tests
cd /home/kaarthikeya/Elyra-main/codebase/app/frontend
npm test

# Run with watch mode
npm test -- --watch

# Run e2e tests
npm run e2e

# Run specific e2e test
npm run e2e -- --grep "auth"
```

### 4.3 Load Testing

```bash
# Start load test environment
docker-compose -f docker-compose.test.yml up -d

# Run load tests
docker-compose exec locust -f tests/load/locustfile.py --host http://backend --headless --users 1000 --spawn-rate 10 --run-time 60s

# Run load test UI
docker-compose exec locust -f tests/load/locustfile.py --host http://backend
```

### 4.4 Smoke Tests

```bash
# Run smoke tests
./app/infra/scripts/smoke-test.sh

# Manual smoke test
curl -f http://localhost:8000/api/v1/health/liveness || exit 1
curl -f http://localhost:3000 || exit 1
echo "Smoke test passed"
```

---

## 5. Database Commands

### 5.1 Migrations

```bash
# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description_of_change"

# Create empty migration
docker-compose exec backend alembic revision -m "description_of_change"

# Apply all migrations
docker-compose exec backend alembic upgrade head

# Apply specific migration
docker-compose exec backend alembic upgrade +revision_id

# Rollback one migration
docker-compose exec backend alembic downgrade -1

# Rollback to specific revision
docker-compose exec backend alembic downgrade revision_id

# Rollback all migrations
docker-compose exec backend alembic downgrade base

# Show migration history
docker-compose exec backend alembic history

# Show current revision
docker-compose exec backend alembic current

# Merge migrations
docker-compose exec backend alembic merge heads -m "merge_heads"
```

### 5.2 Database Seeding

```bash
# Seed database with test data
docker-compose exec backend python app/infra/scripts/seed_data.py

# Or run directly
cd /home/kaarthikeya/Elyra-main/codebase/app/backend
python app/infra/scripts/seed_data.py
```

### 5.3 Database Reset

```bash
# Reset database (drop all tables and recreate)
docker-compose exec backend alembic downgrade base
docker-compose exec backend alembic upgrade head
docker-compose exec backend python app/infra/scripts/seed_data.py

# Or using SQL
docker-compose exec postgres psql -U elyra_user -d elyra_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker-compose exec backend alembic upgrade head
```

### 5.4 Database Interaction

```bash
# Connect to PostgreSQL container
docker-compose exec postgres psql -U elyra_user -d elyra_db

# List tables
docker-compose exec postgres psql -U elyra_user -d elyra_db -c "\dt"

# Query users table
docker-compose exec postgres psql -U elyra_user -d elyra_db -c "SELECT * FROM users LIMIT 5;"

# Count users
docker-compose exec postgres psql -U elyra_user -d elyra_db -c "SELECT COUNT(*) FROM users;"

# Query with SQL
docker-compose exec postgres psql -U elyra_user -d elyra_db -c "SELECT id, email FROM users WHERE is_verified = true;"

# MongoDB shell
docker-compose exec mongodb mongosh -u elyra_user -p elyra_dev_pass elyra_chat

# List MongoDB collections
docker-compose exec mongodb mongosh -u elyra_user -p elyra_dev_pass elyra_chat --eval "db.getCollectionNames()"

# Count messages in MongoDB
docker-compose exec mongodb mongosh -u elyra_user -p elyra_dev_pass elyra_chat --eval "db.messages.countDocuments({})"
```

### 5.5 Redis Commands

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# List keys
docker-compose exec redis redis-cli KEYS "*"

# Get value
docker-compose exec redis redis-cli GET <key>

# Check rate limit
docker-compose exec redis redis-cli GET rate_limit:user:<user_id>

# Check presence
docker-compose exec redis redis-cli ZRANGE presence:online 0 -1

# Delete key
docker-compose exec redis redis-cli DEL <key>

# Flush all (development only!)
docker-compose exec redis redis-cli FLUSHALL
```

---

## 6. Docker Commands

### 6.1 Build Images

```bash
# Build all images
docker-compose build

# Build specific image
docker-compose build backend

# Build with no cache (fresh build)
docker-compose build --no-cache backend

# Build frontend with args
docker-compose build --build-arg NEXT_PUBLIC_API_URL=http://localhost/api/v1 frontend
```

### 6.2 Run Containers

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend

# Start with logs
docker-compose up -d backend && docker-compose logs -f backend

# Restart specific service
docker-compose restart backend

# Recreate containers
docker-compose up -d --force-recreate backend
```

### 6.3 Stop/Remove Containers

```bash
# Stop all services
docker-compose stop

# Stop specific service
docker-compose stop backend

# Remove containers (保留 volumes)
docker-compose down

# Remove containers and volumes (data loss!)
docker-compose down -v

# Remove images
docker-compose down --rmi local

# Remove all (images, volumes, networks)
docker-compose down -v --rmi all
```

### 6.4 Container Management

```bash
# List containers
docker-compose ps

# View logs
docker-compose logs -f backend

# View logs for specific container
docker-compose logs -f elyra_backend

# Execute command in container
docker-compose exec backend ls -la

# Execute with TTY
docker-compose exec -it backend bash

# Copy file from container
docker-compose cp backend:/app/main.py ./main.py

# Copy file to container
docker-compose cp ./main.py backend:/app/main.py
```

### 6.5 Container Debugging

```bash
# Inspect container
docker inspect elyra_backend

# Container logs
docker logs elyra_backend

# Container resource usage
docker stats elyra_backend

# Container processes
docker top elyra_backend

# Enter container shell
docker exec -it elyra_backend /bin/bash

# Network inspection
docker network inspect elyra_network
```

### 6.6 Docker Cleanup

```bash
# Remove unused containers
docker container prune -f

# Remove unused images
docker image prune -f

# Remove unused volumes
docker volume prune -f

# Remove unused networks
docker network prune -f

# Full cleanup
docker system prune -af
```

---

## 7. Kubernetes Commands

### 7.1 Apply Configurations

```bash
# Navigate to k8s directory
cd /home/kaarthikeya/Elyra-main/codebase/infra/k8s

# Apply namespace
kubectl apply -f base/namespace.yaml

# Apply configmap
kubectl apply -f base/configmap.yaml

# Apply secrets (sensitive)
kubectl apply -f base/secrets.yaml

# Apply all base configurations
kubectl apply -f base/

# Or use overlay
kubectl apply -k overlays/staging/
kubectl apply -k overlays/prod/
```

### 7.2 Check Status

```bash
# List pods
kubectl get pods -n elyra

# List services
kubectl get svc -n elyra

# List deployments
kubectl get deployments -n elyra

# List all resources
kubectl get all -n elyra

# Get pod details
kubectl describe pod <pod-name> -n elyra

# Get pod logs
kubectl logs <pod-name> -n elyra
```

### 7.3 Scale Services

```bash
# Scale backend
kubectl scale deployment backend --replicas=5 -n elyra

# Scale with HPA (auto-scaling)
kubectl autoscale deployment backend --min=2 --max=10 --cpu-percent=80 -n elyra

# Check HPA
kubectl get hpa -n elyra
```

### 7.4 Debug Pods

```bash
# Get pod logs
kubectl logs -f <pod-name> -n elyra

# Get previous pod logs (after crash)
kubectl logs --previous <pod-name> -n elyra

# Execute in pod
kubectl exec -it <pod-name> -n elyra -- /bin/bash

# Port forward to pod
kubectl port-forward <pod-name> 8000:8000 -n elyra

# View events
kubectl get events -n elyra --sort-by='.lastTimestamp'
```

### 7.5 Update/Deploy

```bash
# Rolling update
kubectl set image deployment/backend backend=elyra/backend:v2.0.0 -n elyra

# Rollback
kubectl rollout undo deployment/backend -n elyra

# Check rollout status
kubectl rollout status deployment/backend -n elyra

# View rollout history
kubectl rollout history deployment/backend -n elyra
```

### 7.6 Delete Resources

```bash
# Delete namespace (and all resources)
kubectl delete namespace elyra

# Delete specific resource
kubectl delete deployment backend -n elyra

# Delete all resources in namespace
kubectl delete all --all -n elyra
```

---

## 8. AI Service Commands

### 8.1 Embedding Service (Port 9001)

```bash
# Test embedding generation
curl -X POST http://localhost:9001/embed \
  -H "Content-Type: application/json" \
  -d '{"texts": ["Hello world", "Testing embeddings"]}'

# Test similarity calculation
curl -X POST http://localhost:9001/similarity \
  -H "Content-Type: application/json" \
  -d '{"text1": "Hello world", "text2": "Hi there"]}'

# Health check
curl http://localhost:9001/health
```

### 8.2 Moderation Service (Port 9002)

```bash
# Test text moderation
curl -X POST http://localhost:9002/moderate/text \
  -H "Content-Type: application/json" \
  -d '{"text": "Sample text to moderate"}'

# Test batch moderation
curl -X POST http://localhost:9002/moderate/batch \
  -H "Content-Type: application/json" \
  -d '{"texts": ["Text 1", "Text 2", "Text 3"]}'

# Health check
curl http://localhost:9002/health
```

### 8.3 Image Service (Port 9003)

```bash
# Test face verification (stub)
curl -X POST http://localhost:9003/verify/face \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://example.com/face.jpg"}'

# Test image moderation (stub)
curl -X POST http://localhost:9003/moderate/image \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://example.com/image.jpg"}'

# Health check
curl http://localhost:9003/health
```

### 8.4 Fake Profile Service (Port 9004)

```bash
# Test fake profile detection
curl -X POST http://localhost:9004/score \
  -H "Content-Type: application/json" \
  -d '{
    "registration_data": {
      "email": "user@example.com",
      "bio": "Looking for love",
      "photos": ["url1.jpg", "url2.jpg"]
    }
  }'

# Health check
curl http://localhost:9004/health
```

---

## 9. Development Utilities

### 9.1 Linting

```bash
# Backend linting (ruff)
cd /home/kaarthikeya/Elyra-main/codebase/app/backend
# Install ruff if needed
pip install ruff

# Run ruff
ruff check .

# Fix auto-fixable issues
ruff check --fix .

# Format code
ruff format .

# Backend linting (flake8 alternative)
pip install flake8
flake8 .

# Frontend linting
cd /home/kaarthikeya/Elyra-main/codebase/app/frontend
npm run lint
```

### 9.2 Formatting

```bash
# Backend formatting
cd /home/kaarthikeya/Elyra-main/codebase/app/backend
pip install black
black .
isort .

# Frontend formatting
cd /home/kaarthikeya/Elyra-main/codebase/app/frontend
npm run format
```

### 9.3 Type Checking

```bash
# Backend type checking
cd /home/kaarthikeya/Elyra-main/codebase/app/backend
pip install mypy
mypy .

# Frontend type checking
cd /home/kaarthikeya/Elyra-main/codebase/app/frontend
npm run typecheck
```

### 9.4 Code Generation

```bash
# Generate SQLAlchemy models from database
cd /home/kaarthikeya/Elyra-main/codebase/app/backend
sqlacodegen postgresql+asyncpg://user:pass@localhost/db > models/generated.py

# Generate Pydantic schemas from models
pip install datamodel-code-generator
datamodel-codegen --input models.py --output schemas.py
```

### 9.5 Dependency Management

```bash
# Backend - update requirements
pip freeze > requirements.txt

# Frontend - update package.json
npm update

# Check for vulnerabilities
cd /home/kaarthikeya/Elyra-main/codebase/app/frontend
npm audit
```

---

## 10. Build Commands

### 10.1 Docker Images

```bash
# Build all images
docker-compose build

# Build with tag
docker build -f app/backend/Dockerfile -t elyra/backend:latest app/backend

# Build and push to registry
docker build -t elyra/backend:latest app/backend
docker tag elyra/backend:latest registry.example.com/elyra/backend:latest
docker push registry.example.com/elyra/backend:latest

# Multi-platform build
docker buildx build --platform linux/amd64,linux/arm64 -t elyra/backend:latest app/backend
```

### 10.2 Backend Production Build

```bash
# Build backend Docker image
docker build -f app/backend/Dockerfile -t elyra/backend:prod app/backend

# Run backend in production mode
docker run -d -p 8000:8000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  -e JWT_SECRET_KEY="..." \
  elyra/backend:prod
```

### 10.3 Frontend Production Build

```bash
# Build frontend Docker image
docker build -f app/frontend/Dockerfile -t elyra/frontend:prod \
  --build-arg NEXT_PUBLIC_API_URL=https://api.elyra.app \
  app/frontend

# Run frontend
docker run -d -p 3000:3000 elyra/frontend:prod

# Or build locally
cd /home/kaarthikeya/Elyra-main/codebase/app/frontend
npm run build

# Start production server
npm run start
```

### 10.4 Static Export

```bash
# Frontend static export (if enabled)
cd /home/kaarthikeya/Elyra-main/codebase/app/frontend
npm run export

# Output in app/out directory
ls app/out
```

---

## 11. Deployment Commands

### 11.1 Local Deployment

```bash
# Full local deployment
cd /home/kaarthikeya/Elyra-main/codebase

# 1. Setup environment
cp app/.env.example app/.env

# 2. Build images
docker-compose build

# 3. Start services
docker-compose up -d

# 4. Initialize database
docker-compose exec backend alembic upgrade head

# 5. Seed data
docker-compose exec backend python app/infra/scripts/seed_data.py

# 6. Verify
curl http://localhost:8000/api/v1/health/liveness
curl http://localhost:3000
```

### 11.2 Staging Deployment

```bash
# Apply staging configs
cd /home/kaarthikeya/Elyra-main/codebase/infra/k8s
kubectl apply -k overlays/staging/

# Check deployment
kubectl rollout status deployment/backend -n elyra-staging

# Get staging URLs
kubectl get ingress -n elyra-staging
```

### 11.3 Production Deployment

```bash
# Apply production configs
cd /home/kaarthikeya/Elyra-main/codebase/infra/k8s
kubectl apply -k overlays/prod/

# Check deployment
kubectl rollout status deployment/backend -n elyra-prod

# Get production URLs
kubectl get ingress -n elyra-prod
```

### 11.4 Database Backup

```bash
# Manual PostgreSQL backup
docker-compose exec postgres pg_dump -U elyra_user elyra_db > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U elyra_user elyra_db < backup.sql

# S3 backup (via CronJob, automatic)
# Trigger manually
kubectl create job --from=cronjob/backup manual-backup -n elyra
```

### 11.5 Database Restore

```bash
# From SQL dump
docker-compose exec -T postgres psql -U elyra_user elyra_db < backup.sql

# From S3
kubectl exec -it backup-pod-xyz -n elyra -- /restore.sh
```

---

## 12. Troubleshooting Commands

### 12.1 Service Won't Start

```bash
# Check service logs
docker-compose logs backend

# Check container status
docker-compose ps

# Check if port is in use
lsof -i :8000

# Check environment variables
docker-compose exec backend env | grep -E "DATABASE|REDIS|MONGO"
```

### 12.2 Database Connection Issues

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec backend python -c "
import asyncio
import asyncpg
async def test():
    conn = await asyncpg.connect('postgresql+asyncpg://elyra_user:elyra_dev_pass@postgres:5432/elyra_db')
    print('Connected!')
    await conn.close()
asyncio.run(test())
"

# Restart PostgreSQL
docker-compose restart postgres
```

### 12.3 Authentication Errors

```bash
# Verify JWT_SECRET_KEY
docker-compose exec backend env | grep JWT

# Test token generation
docker-compose exec backend python -c "
from core.security import create_access_token
token = create_access_token({'sub': 'test@example.com'})
print(token)
"

# Debug token
docker-compose exec backend python -c "
from core.security import decode_token
try:
    data = decode_token('your-token-here')
    print(data)
except Exception as e:
    print(f'Error: {e}')
"
```

### 12.4 WebSocket Issues

```bash
# Verify Nginx WebSocket proxy config
docker-compose exec nginx cat /etc/nginx/nginx.conf | grep -A5 socket.io

# Test WebSocket directly
docker-compose exec backend python -c "
import socketio
sio = socketio.Client()
sio.connect('http://localhost:8000', auth={'token': 'test'})
print('Connected!')
sio.disconnect()
"
```

### 12.5 AI Service Issues

```bash
# Check service is running
docker-compose ps | grep service

# Check service logs
docker-compose logs embedding-service

# Test service endpoint
curl http://localhost:9001/health

# Restart service
docker-compose restart embedding-service

# Check model files exist
docker-compose exec embedding-service ls -la /app/models/
```

### 12.6 Performance Issues

```bash
# Check resource usage
docker stats

# PostgreSQL slow queries
docker-compose exec postgres psql -U elyra_user -d elyra_db -c "
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
"

# Check indexes
docker-compose exec postgres psql -U elyra_user -d elyra_db -c "
SELECT indexrelname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
"
```

### 12.7 Reset Everything

```bash
# Complete reset
cd /home/kaarthikeya/Elyra-main/codebase

# 1. Stop everything
docker-compose down -v

# 2. Clean up volumes
docker volume rm elyra_postgres_data
docker volume rm elyra_redis_data
docker volume rm elyra_mongo_data

# 3. Remove images (optional)
docker system prune -af

# 4. Recreate environment
cp app/.env.example app/.env

# 5. Start fresh
docker-compose up -d

# 6. Initialize
docker-compose exec backend alembic upgrade head
docker-compose exec backend python app/infra/scripts/seed_data.py
```

---

## Full Project Startup Flow

### From Clean State

```bash
# 1. Navigate to project
cd /home/kaarthikeya/Elyra-main/codebase

# 2. Setup environment
cp app/.env.example app/.env

# 3. Create required directories
mkdir -p app/backend/app/backend

# 4. Start infrastructure (PostgreSQL, Redis, MongoDB, MinIO)
docker-compose up -d postgres redis mongodb minio minio-init

# 5. Wait for databases (check health)
until docker-compose exec postgres pg_isready -U elyra_user; do sleep 1; done
echo "PostgreSQL ready"

# 6. Start backend
docker-compose up -d backend

# 7. Run migrations
docker-compose exec backend alembic upgrade head

# 8. Seed database
docker-compose exec backend python app/infra/scripts/seed_data.py

# 9. Start AI services
docker-compose up -d embedding-service moderation-service image-service fake-profile-service

# 10. Start frontend
docker-compose up -d frontend

# 11. Start Nginx (reverse proxy)
docker-compose up -d nginx

# 12. Verify all services
curl http://localhost:8000/api/v1/health/liveness
curl http://localhost:3000
echo "System ready!"
```

---

## Daily Development Workflow

```bash
# Start development (from any state)
cd /home/kaarthikeya/Elyra-main/codebase
docker-compose up -d

# View logs
docker-compose logs -f backend

# Run tests before commit
docker-compose exec backend pytest app/backend/tests/unit -v

# Make code changes (auto-reload enabled)
# Edit files in app/backend/

# Run specific migration after model change
docker-compose exec backend alembic revision --autogenerate -m "add_user_field"
docker-compose exec backend alembic upgrade head

# Stop when done
docker-compose down
```

---

## Emergency Recovery

```bash
# Service unresponsive
docker-compose restart backend
docker-compose logs -f backend

# Database locked
docker-compose restart postgres
docker-compose exec postgres psql -U elyra_user -d elyra_db -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active';"

# Redis memory issue
docker-compose exec redis redis-cli FLUSHALL

# Complete rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

---

**End of Command Reference**