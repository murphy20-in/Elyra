"""
Sentry SDK initialization for the FastAPI backend.
"""

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
import logging
from app.backend.core.config import settings


def init_sentry():
    """
    Initialize Sentry SDK.
    No-op if SENTRY_DSN is empty or not set.
    """
    if not settings.SENTRY_DSN:
        return

    def before_send(event, hint):
        if 'request' in event:
            data = event['request'].get('data', {})
            for field in ('password', 'email', 'phone', 'address', 'government_id'):
                data.pop(field, None)
            headers = event['request'].get('headers', {})
            headers.pop('Authorization', None)
            headers.pop('authorization', None)
        return event

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.APP_ENV,
        release=getattr(settings, 'APP_VERSION', '0.1.0'),
        traces_sample_rate=0.1,
        profiles_sample_rate=0.05,
        attach_stacktrace=True,
        send_default_pii=False,
        before_send=before_send,
        integrations=[
            FastApiIntegration(transaction_style='endpoint'),
            SqlalchemyIntegration(),
            RedisIntegration(),
            CeleryIntegration(),
            LoggingIntegration(level=logging.WARNING, event_level=logging.ERROR),
        ],
    )