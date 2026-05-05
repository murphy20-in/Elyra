#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# init-db.sh
# Executed by the postgres container on first start via:
#   /docker-entrypoint-initdb.d/init-db.sh
#
# Creates:
#   - uuid-ossp extension (for gen_random_uuid())
#   - vector extension    (for pgvector similarity search)
#   - elyra_test database (for pytest — mirrors main DB with same extensions)
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo "[init-db] Enabling extensions on primary database: ${POSTGRES_DB}"
psql -v ON_ERROR_STOP=1 \
     --username "${POSTGRES_USER}" \
     --dbname   "${POSTGRES_DB}" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
EOSQL

echo "[init-db] Creating test database: elyra_test"
psql -v ON_ERROR_STOP=1 \
     --username "${POSTGRES_USER}" \
     --dbname   "${POSTGRES_DB}" <<-EOSQL
    SELECT 'CREATE DATABASE elyra_test'
        WHERE NOT EXISTS (
            SELECT FROM pg_database WHERE datname = 'elyra_test'
        )\gexec
EOSQL

echo "[init-db] Enabling extensions on test database"
psql -v ON_ERROR_STOP=1 \
     --username "${POSTGRES_USER}" \
     --dbname   "elyra_test" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
EOSQL

echo "[init-db] ✅ Database initialization complete."