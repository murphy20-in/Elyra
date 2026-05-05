# Elyra Load Tests (Locust)

## Setup

```bash
cd /home/kaarthikeya/Elyra-main/codebase
pip install locust==2.29.0
```

## Run Load Tests

**Interactive web UI** (http://localhost:8089):
```bash
locust -f tests/load/locustfile.py --host http://localhost
```

**Headless (CI mode)**:
```bash
locust -f tests/load/locustfile.py \
  --host http://localhost \
  --users 200 \
  --spawn-rate 20 \
  --run-time 2m \
  --headless
```

## Performance Targets (SLO)

| Endpoint | p50 | p95 |
|---|---|---|
| `/matches/discover` | < 200ms | < 500ms |
| `/auth/login` | < 100ms | < 300ms |
| `/chat/threads` | < 150ms | < 400ms |
| `/profiles/me` | < 100ms | < 250ms |

The `on_quitting` hook exits with code 1 if p95 > 500ms or p50 > 200ms.