import logging
import sys

import structlog
from structlog.processors import (
    CallsiteParameter,
    CallsiteParameterAdder,
    JSONRenderer,
    TimeStamper,
)

from app.backend.core.config import settings


def mask_email(email: str) -> str:
    """Mask email: 'user@example.com' → 'u***@example.com'"""
    if not email or '@' not in email:
        return '***'
    local, domain = email.split('@', 1)
    return f"{local[0]}***@{domain}"


def _mask_pii_processor(logger, method, event_dict):
    """Mask PII fields in log records."""
    if 'email' in event_dict:
        event_dict['email'] = mask_email(str(event_dict['email']))
    for field in ('password', 'password_hash', 'token', 'refresh_token', 'address', 'government_id'):
        event_dict.pop(field, None)
    return event_dict


def configure_logging() -> None:
    is_production = settings.APP_ENV == "production"

    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        TimeStamper(fmt="iso", utc=True),
        CallsiteParameterAdder(
            {
                CallsiteParameter.FILENAME: "file",
                CallsiteParameter.FUNC_NAME: "function",
                CallsiteParameter.LINENO: "line",
            }
        ),
        _mask_pii_processor,
    ]

    if is_production:
        processors.append(JSONRenderer())
    else:
        processors.append(
            structlog.dev.ConsoleRenderer(
                colors=True,
                pad_level=2,
            )
        )

    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processor=processors[-1],
        foreign_pre_chain=processors[:-1],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(log_level)


def get_logger(name: str | None = None) -> structlog.BoundLogger:
    return structlog.get_logger(name)