import sentry_sdk
from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.backend.core.config import settings
from app.backend.core.logging import configure_logging, get_logger
from app.backend.core.metrics import setup_metrics
from app.backend.core.sentry_init import init_sentry
from app.backend.core.mongodb import connect_mongodb, disconnect_mongodb
from app.backend.core.redis_client import connect_redis, disconnect_redis
from app.backend.core.middleware import (
    RequestIdMiddleware,
    SecurityHeadersMiddleware,
    RequestLoggingMiddleware,
    RateLimitMiddleware,
)
from app.backend.routes import auth, profile, match, chat, safety, payment, notification, health

from app.backend.services.chat_service import ChatService
from websocket.manager import create_socket_app

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    init_sentry()

    await connect_redis()
    await connect_mongodb()

    chat_service = ChatService()
    await chat_service.create_indexes()

    import websocket.handlers

    from app.backend.core.events import EventSubscriber
    redis = await connect_redis()
    subscriber = EventSubscriber(redis)
    subscriber_task = asyncio.create_task(subscriber.start())
    logger.info("event_subscriber_started")

    logger.info(
        "Elyra API started",
        version=settings.APP_VERSION,
        env=settings.APP_ENV,
    )

    yield

    logger.info("Elyra API shutdown")
    subscriber.stop()
    subscriber_task.cancel()
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
fastapi_app.include_router(notification.router, prefix="/api/v1/notifications", tags=["Notifications"])
fastapi_app.include_router(health.router, prefix="/api/v1/health", tags=["Health"])


@fastapi_app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


@fastapi_app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled exception",
        exc=str(exc),
        path=request.url.path,
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error_code": "INTERNAL_ERROR",
        },
    )


app = create_socket_app(fastapi_app)