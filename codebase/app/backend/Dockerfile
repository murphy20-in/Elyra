# ── Stage 1: dependency install ───────────────────────────────────────────────
FROM python:3.11-slim AS deps

WORKDIR /app

# System libraries needed for: asyncpg (gcc, libpq), cryptography (gcc)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Runtime-only system libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from deps stage
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Copy application code into the package layout expected by
# `uvicorn app.backend.main:app`. Placing it under /app/app/backend (instead of
# /app root) prevents the local `websocket/` directory from shadowing the
# installed `websocket-client` package, which breaks python-engineio.
COPY . /app/app/backend/

RUN find /app/app/backend -name '__pycache__' -type d -exec rm -rf {} + \
    && rm -rf /app/app/backend/.mypy_cache /app/app/backend/.ruff_cache

# Non-root user (security hardening)
RUN adduser --disabled-password --gecos '' --uid 1001 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Liveness probe: hit the mounted health router
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -fs http://localhost:8000/api/v1/health/live || exit 1

# Production: 4 uvicorn workers
# Dev (docker-compose): overridden with --reload
# NOTE: image is built from ./backend (per docker-compose context). At runtime
# the Python package layout requires `app.backend.main:app`, so the container
# WORKDIR contains the project root with `app/backend/...` mounted in place.
CMD ["uvicorn", "app.backend.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "4", \
     "--loop", "uvloop", \
     "--access-log", \
     "--log-level", "info"]