#!/usr/bin/env bash
set -euo pipefail

PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-elyra_user}"
PGDATABASE="${PGDATABASE:-elyra_db}"
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "[migrations] Waiting for PostgreSQL at ${PGHOST}:${PGPORT}..."

retries=0
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -q; do
    retries=$((retries + 1))
    if [ "$retries" -ge "$MAX_RETRIES" ]; then
        echo "[migrations] ERROR: PostgreSQL not ready after ${MAX_RETRIES} attempts. Exiting."
        exit 1
    fi
    echo "[migrations]   Attempt ${retries}/${MAX_RETRIES} — retrying in ${RETRY_INTERVAL}s..."
    sleep "$RETRY_INTERVAL"
done

echo "[migrations] PostgreSQL is ready. Running Alembic migrations..."

cd /home/kaarthikeya/Elyra-main/codebase/app/backend
alembic upgrade head

echo "[migrations] ✅ Migrations complete."
alembic current

exit 0