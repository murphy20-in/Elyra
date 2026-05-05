from fastapi import FastAPI
from prometheus_fastapi_instrumentator import PrometheusInstrumentator
from prometheus_client import Counter, Histogram, Gauge

from app.backend.core.config import settings

instrumentator = PrometheusInstrumentator(
    latency_highr=False,
    group_paths=True,
)

messages_sent_total = Counter(
    'elyra_messages_sent_total',
    'Total chat messages sent',
    ['moderated']
)

match_score_histogram = Histogram(
    'elyra_match_score_histogram',
    'Distribution of composite match scores',
    buckets=[0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 1.0]
)

ai_call_latency = Histogram(
    'elyra_ai_call_latency_seconds',
    'Latency of calls to AI microservices',
    ['service', 'endpoint'],
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 15.0]
)

ws_connections_active = Gauge(
    'elyra_ws_connections_active',
    'Number of currently active WebSocket connections'
)

safety_event_total = Counter(
    'elyra_safety_event_total',
    'Safety-related events',
    ['event_type']
)

subscription_revenue_total = Counter(
    'elyra_subscription_revenue_total',
    'Total subscription revenue processed',
    ['plan', 'currency']
)


def setup_metrics(app: FastAPI) -> None:
    if settings.PROMETHEUS_ENABLED:
        instrumentator.instrument(app).expose(
            app,
            include_in_schema=False,
            tags=["observability"],
        )