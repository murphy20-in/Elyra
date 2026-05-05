import time
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.backend.core.config import settings
from app.backend.core.database import get_db
from app.backend.core.redis_client import get_redis
from app.backend.core.mongodb import get_mongo_db
from app.backend.core.dependencies import require_role
from app.backend.models.user import User


router = APIRouter(tags=["Health"])

_start_time = time.time()


@router.get("/live")
async def liveness():
    """Always 200 - proves the process is alive."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@router.get("/ready")
async def readiness():
    """Checks all three databases."""
    from app.backend.core.mongodb import get_mongo_client

    checks = {}
    all_ok = True

    t0 = time.monotonic()
    try:
        async for db in get_db():
            await db.execute(text("SELECT 1"))
            break
        checks["postgres"] = {"ok": True, "latency_ms": round((time.monotonic() - t0) * 1000, 2)}
    except Exception as e:
        checks["postgres"] = {"ok": False, "error": str(e)}
        all_ok = False

    t0 = time.monotonic()
    try:
        redis = await get_redis()
        await redis.ping()
        checks["redis"] = {"ok": True, "latency_ms": round((time.monotonic() - t0) * 1000, 2)}
    except Exception as e:
        checks["redis"] = {"ok": False, "error": str(e)}
        all_ok = False

    t0 = time.monotonic()
    try:
        client = get_mongo_client()
        await client.admin.command("ping")
        checks["mongodb"] = {"ok": True, "latency_ms": round((time.monotonic() - t0) * 1000, 2)}
    except Exception as e:
        checks["mongodb"] = {"ok": False, "error": str(e)}
        all_ok = False

    response = {"status": "ok" if all_ok else "degraded", "checks": checks}
    if not all_ok:
        raise HTTPException(status_code=503, detail=response)
    return response


@router.get("")
async def health():
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "env": settings.APP_ENV,
    }


@router.get("/detailed")
async def health_detailed(
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        await db.execute(text("SELECT 1"))
        postgres_status = "ok"
    except Exception:
        postgres_status = "error"

    try:
        await redis.ping()
        redis_status = "ok"
    except Exception:
        redis_status = "error"

    try:
        mongo_db = await get_mongo_db()
        await mongo_db.command({"ping": 1})
        mongodb_status = "ok"
    except Exception:
        mongodb_status = "error"

    uptime_seconds = int(time.time() - _start_time)

    overall_status = "ok" if all(
        s == "ok" for s in [postgres_status, redis_status, mongodb_status]
    ) else "degraded"

    return {
        "status": overall_status,
        "postgres": postgres_status,
        "redis": redis_status,
        "mongodb": mongodb_status,
        "uptime_seconds": uptime_seconds,
    }