"""Elyra FastAPI application entrypoint."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.backend.core.config import settings
from app.backend.core.logging import configure_logging, get_logger
from app.backend.core.metrics import setup_metrics
from app.backend.core.middleware import (
    RateLimitMiddleware,
    RequestIdMiddleware,
    RequestLoggingMiddleware,
    SecurityHeadersMiddleware,
)
from app.backend.core.mongodb import connect_mongodb, disconnect_mongodb
from app.backend.core.redis_client import connect_redis, disconnect_redis, get_redis
from app.backend.core.sentry_init import init_sentry
from app.backend.routes import (
    auth,
    chat,
    health,
    match,
    notification,
    payment,
    profile,
    safety,
)
from app.backend.websocket.manager import create_socket_app

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    init_sentry()

    await connect_redis()
    await connect_mongodb()

    # Verify AI service health (best-effort, non-blocking)
    try:
        from app.backend.core.ai_client import ai_client

        await ai_client.health_check()
    except Exception as exc:  # pragma: no cover - best-effort
        logger.warning("ai_health_check_failed", error=str(exc))

    # Start event subscriber
    redis = await get_redis()
    from app.backend.core.events import EventSubscriber

    subscriber = EventSubscriber(redis)
    subscriber_task = asyncio.create_task(subscriber.start())

    # Ensure websocket handlers are registered
    import importlib
    importlib.import_module("app.backend.websocket.handlers")

    logger.info(
        "elyra_api_started",
        version=settings.APP_VERSION,
        env=settings.APP_ENV,
    )

    try:
        yield
    finally:
        logger.info("elyra_api_shutdown")
        subscriber.stop()
        subscriber_task.cancel()
        try:
            await subscriber_task
        except (asyncio.CancelledError, Exception):
            pass
        await disconnect_redis()
        await disconnect_mongodb()


fastapi_app = FastAPI(
    title="Elyra API",
    description="Privacy-first dating platform API",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fastapi_app.add_middleware(RateLimitMiddleware)
fastapi_app.add_middleware(SecurityHeadersMiddleware)
fastapi_app.add_middleware(RequestLoggingMiddleware)
fastapi_app.add_middleware(RequestIdMiddleware)

setup_metrics(fastapi_app)

fastapi_app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
fastapi_app.include_router(profile.router, prefix="/api/v1/profiles", tags=["Profiles"])
fastapi_app.include_router(match.router, prefix="/api/v1/matches", tags=["Matches"])
fastapi_app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
fastapi_app.include_router(safety.router, prefix="/api/v1/safety", tags=["Safety"])
fastapi_app.include_router(payment.router, prefix="/api/v1/payments", tags=["Payments"])
fastapi_app.include_router(
    notification.router, prefix="/api/v1/notifications", tags=["Notifications"]
)
fastapi_app.include_router(health.router, prefix="/api/v1/health", tags=["Health"])


@fastapi_app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")


@fastapi_app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "unhandled_exception",
        exc=str(exc),
        path=request.url.path,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error_code": "INTERNAL_ERROR"},
    )


# Wrap FastAPI with socket.io ASGI mount
app = create_socket_app(fastapi_app)
