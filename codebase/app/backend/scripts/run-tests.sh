#!/usr/bin/env bash
set -euo pipefail

CODEBASE_ROOT="/home/kaarthikeya/Elyra-main/codebase"
BACKEND_DIR="$CODEBASE_ROOT/app/backend"

echo "=== Elyra Backend Test Suite ==="

echo "[1] Starting test databases..."
docker compose -f "$CODEBASE_ROOT/docker-compose.test.yml" up -d

echo "[2] Waiting for PostgreSQL..."
until docker compose -f "$CODEBASE_ROOT/docker-compose.test.yml" exec -T postgres-test pg_isready -U elyra_user -d elyra_test -q; do sleep 2; done
echo "    PostgreSQL ready."

echo "[3] Waiting for Redis..."
until docker compose -f "$CODEBASE_ROOT/docker-compose.test.yml" exec -T redis-test redis-cli ping | grep -q PONG; do sleep 1; done
echo "    Redis ready."

echo "[4] Waiting for MongoDB..."
sleep 5
echo "    MongoDB ready."

echo "[5] Running migrations..."
cd "$BACKEND_DIR"
DATABASE_URL="postgresql+asyncpg://elyra_user:elyra_test_pass@localhost:5433/elyra_test" alembic upgrade head
echo "    Migrations complete."

echo "[6] Running unit tests..."
pytest tests/unit/ -v -m unit --tb=short -q
echo "    Unit tests passed."

echo "[7] Running API tests..."
pytest tests/api/ -v -m api --tb=short -q
echo "    API tests passed."

echo "[8] Running WebSocket tests..."
pytest tests/websocket/ -v -m websocket --tb=short -q
echo "    WebSocket tests passed."

echo "[9] Running integration tests..."
pytest tests/integration/ -v -m integration --tb=short -q
echo "    Integration tests passed."

echo "[10] Running security tests..."
pytest tests/security/ -v -m security --tb=short -q
echo "    Security tests passed."

echo "[11] Generating coverage report..."
pytest tests/ \
    --cov=. \
    --cov-report=html:htmlcov \
    --cov-report=xml:coverage.xml \
    --cov-report=term-missing \
    --junitxml=test-results.xml \
    -q

python -c "
import xml.etree.ElementTree as ET
tree = ET.parse('coverage.xml')
root = tree.getroot()
line_rate = float(root.attrib.get('line-rate', 0))
pct = line_rate * 100
print(f'Coverage: {pct:.1f}%')
if pct < 80:
    print('FAIL: Coverage below 80%')
    exit(1)
print('PASS: Coverage above 80%')
"

echo "[13] Tearing down..."
docker compose -f "$CODEBASE_ROOT/docker-compose.test.yml" down -v

echo "=== ALL TESTS PASSED ==="