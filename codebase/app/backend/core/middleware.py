import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.backend.core.config import settings
from app.backend.core.logging import get_logger
from app.backend.core.redis_client import get_redis


logger = get_logger(__name__)


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        if settings.APP_ENV == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()

        response = await call_next(request)

        duration_ms = (time.perf_counter() - start_time) * 1000
        request_id = getattr(request.state, "request_id", "unknown")

        log_data = {
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round(duration_ms, 2),
            "request_id": request_id,
        }

        if response.status_code >= 500:
            logger.error("request_error", **log_data)
        elif response.status_code >= 400:
            logger.warning("request_warning", **log_data)
        else:
            logger.info("request_completed", **log_data)

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.auth_rate_limit = 10
        self.user_rate_limit = 60
        self.global_rate_limit = 100

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        if not path.startswith("/api/v1"):
            return await call_next(request)

        if path.startswith("/api/v1/auth") and request.method in ["POST"]:
            limit = self.auth_rate_limit
            key = f"rate_limit:ip:{self._get_client_ip(request)}"
        elif path.startswith("/api/v1") and request.headers.get("Authorization"):
            try:
                from app.backend.core.security import decode_token

                auth_header = request.headers.get("Authorization", "")
                if auth_header.startswith("Bearer "):
                    token = auth_header[7:]
                    payload = decode_token(token)
                    user_id = payload.get("sub", "unknown")
                    limit = self.user_rate_limit
                    key = f"rate_limit:user:{user_id}"
                else:
                    limit = self.global_rate_limit
                    key = f"rate_limit:ip:{self._get_client_ip(request)}"
            except Exception:
                limit = self.global_rate_limit
                key = f"rate_limit:ip:{self._get_client_ip(request)}"
        else:
            limit = self.global_rate_limit
            key = f"rate_limit:ip:{self._get_client_ip(request)}"

        redis = await get_redis()

        now = time.time()
        window = 60

        pipe = redis.pipeline()
        pipe.zadd(key, {str(now): now})
        pipe.zremrangebyscore(key, 0, now - window)
        pipe.zcard(key)
        pipe.expire(key, window + 1)
        results = await pipe.execute()

        current_count = results[2]

        if current_count > limit:
            oldest_entry = await redis.zrange(key, 0, 0, withscores=True)
            if oldest_entry:
                reset_time = int(oldest_entry[0][1] + window - now) + 1
            else:
                reset_time = 60

            logger.warning("rate_limit_exceeded", key=key, count=current_count, limit=limit)

            return Response(
                content='{"detail": "Rate limit exceeded", "error_code": "RATE_LIMIT_EXCEEDED"}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": str(reset_time)},
            )

        response = await call_next(request)
        return response

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"