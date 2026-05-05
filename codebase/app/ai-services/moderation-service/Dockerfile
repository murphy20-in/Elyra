FROM python:3.11-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Pre-download the sentence-transformer model during build
# (avoids cold-start download delay at runtime)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY . .

RUN adduser --disabled-password --gecos '' --uid 1001 appuser \
    && chown -R appuser /app
USER appuser

EXPOSE 9001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -fs http://localhost:9001/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9001", "--workers", "2"]