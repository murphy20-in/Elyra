# Elyra

A privacy-first, AI-enabled LGBTQIA+ dating platform built for India.

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/downloads/release/python-3110/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-green.svg)](https://fastapi.tiangolo.com/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)

Elyra is a dating platform that prioritizes privacy and safety for the LGBTQIA+ community in India. Based on the Pehchaan Layer philosophy, users can express their authentic identity while maintaining control over their personal information.

## Architecture

| Service | Port | Description |
|---------|------|-------------|
| Backend (FastAPI) | 8000 | Main API server |
| Frontend (Next.js) | 3000 | Web application |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Caching & sessions |
| MongoDB | 27017 | Chat messages |
| MinIO | 9000/9001 | Media storage |
| Embedding Service | 9001 | Text embeddings |
| Moderation Service | 9002 | Content moderation |
| Image Service | 9003 | Image processing |
| Fake Profile Service | 9004 | Profile verification |

## Quickstart

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker & Docker Compose

### Setup

```bash
# Clone the repository
git clone https://github.com/elyra-app/elyra.git
cd elyra

# Copy environment file
cp .env.example .env

# Start services
docker compose up
```

The API will be available at http://localhost:8000 with Swagger docs at http://localhost:8000/docs.
The frontend will be available at http://localhost:3000.

## Directory Structure

```
elyra/
├── app/
│   ├── backend/           # FastAPI backend
│   │   ├── core/          # Config, logging, metrics
│   │   ├── models/        # SQLAlchemy models
│   │   ├── routes/        # API endpoints
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   └── websocket/     # WebSocket handlers
│   ├── frontend/          # Next.js frontend
│   ├── ai-services/       # ML services
│   ├── mobile/            # React Native app
│   └── infra/            # Infrastructure config
└── scripts/               # Setup & deployment scripts
```

## Contributing

Contributions are welcome. Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details.