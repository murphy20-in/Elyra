from celery import Celery

from app.backend.core.config import settings


celery_app = Celery(
    "elyra",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.backend.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)