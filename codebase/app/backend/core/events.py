"""
Redis pub/sub event bus for Elyra.
"""

import asyncio
import json
from datetime import datetime, timezone

from app.backend.core.redis_client import get_redis
from app.backend.core.logging import get_logger

logger = get_logger(__name__)

CHANNEL = "elyra:events"

USER_REGISTERED = "user.registered"
PROFILE_UPDATED = "profile.updated"
PREFERENCES_UPDATED = "preferences.updated"
MESSAGE_SENT = "message.sent"
REPORT_CREATED = "report.created"
MATCH_CREATED = "match.created"
PAYMENT_COMPLETED = "payment.completed"
SAFETY_SOS = "safety.sos"
SAFETY_LOCATION_UPDATED = "safety.location_updated"
MESSAGE_MODERATION = "message.moderation"


class EventPublisher:
    CHANNEL = "elyra:events"

    def __init__(self, redis_client):
        self.redis = redis_client

    async def publish(self, event_type: str, data: dict) -> None:
        """Publish an event to the Redis channel."""
        payload = json.dumps({
            "event": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        })
        try:
            await self.redis.publish(self.CHANNEL, payload)
            logger.debug("event_published", event=event_type)
        except Exception as exc:
            logger.error("event_publish_failed", event=event_type, error=str(exc))


class EventSubscriber:
    """Background task that subscribes to elyra:events and routes to handlers."""

    HANDLERS: dict[str, list] = {}

    def __init__(self, redis_client):
        self.redis = redis_client
        self._running = False

    async def start(self):
        self._running = True
        pubsub = self.redis.pubsub()
        await pubsub.subscribe(EventPublisher.CHANNEL)
        logger.info("event_subscriber_started", channel=EventPublisher.CHANNEL)
        try:
            async for message in pubsub.listen():
                if not self._running:
                    break
                if message.get("type") != "message":
                    continue
                try:
                    event = json.loads(message["data"])
                    await self._dispatch(event)
                except Exception as exc:
                    logger.error("event_dispatch_error", error=str(exc))
        finally:
            await pubsub.unsubscribe(EventPublisher.CHANNEL)
            logger.info("event_subscriber_stopped")

    def stop(self):
        self._running = False

    async def _dispatch(self, event: dict):
        event_type = event.get("event")
        data = event.get("data", {})
        if event_type is None:
            logger.debug("event_no_type", event=event)
            return
        handlers = self.HANDLERS.get(event_type, [])
        if not handlers:
            logger.debug("event_no_handlers", event=event_type)
            return
        for handler in handlers:
            asyncio.create_task(self._safe_call(handler, data, event_type))

    @staticmethod
    async def _safe_call(handler, data: dict, event_type: str):
        try:
            await handler(data)
        except Exception as exc:
            logger.error("event_handler_error",
                         event=event_type, handler=handler.__name__, error=str(exc))


async def publish_event(event_type: str, payload: dict) -> None:
    redis = await get_redis()
    message = {
        "event": event_type,
        "payload": payload,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await redis.publish(CHANNEL, json.dumps(message))


# ── Event Handlers ───────────────────────────────────────────────────────────

async def handle_initial_embedding(data: dict):
    """Triggered by: user.registered"""
    from app.backend.core.ai_client import AIClient
    from app.backend.core.config import settings
    from app.backend.core.database import get_async_session
    from app.backend.models.profile import PublicProfile
    from app.backend.models.embedding import UserEmbedding
    from sqlalchemy import select
    import uuid

    user_id = data.get("user_id")
    async with get_async_session() as session:
        profile = await session.execute(
            select(PublicProfile).where(PublicProfile.user_id == uuid.UUID(user_id))
        )
        profile = profile.scalar_one_or_none()
        if not profile:
            return
        text = f"{profile.bio or ''} {profile.gender_identity} {profile.sexual_orientation} {profile.intent} {profile.city}".strip()
        ai = AIClient(settings)
        embedding = await ai.generate_embedding(text)
        existing = await session.execute(
            select(UserEmbedding).where(UserEmbedding.user_id == uuid.UUID(user_id))
        )
        existing = existing.scalar_one_or_none()
        if existing:
            existing.embedding = embedding
        else:
            session.add(UserEmbedding(user_id=uuid.UUID(user_id), embedding=embedding))
        await session.commit()
    logger.info("embedding_created", user_id=user_id)


async def handle_update_embedding(data: dict):
    """Triggered by: profile.updated, preferences.updated"""
    await handle_initial_embedding(data)


async def handle_send_email_verification(data: dict):
    """Triggered by: user.registered"""
    from app.backend.services.email_service import EmailService
    from app.backend.core.security import create_email_verification_token
    email = data.get("email")
    user_id = data.get("user_id")
    if not email:
        return
    token = create_email_verification_token(user_id)
    email_svc = EmailService()
    await email_svc.send_verification_email(email, token)
    logger.info("verification_email_sent", user_id=user_id)


async def handle_score_new_profile(data: dict):
    """Triggered by: user.registered"""
    from app.backend.services.trust_safety_service import TrustSafetyService
    from app.backend.core.database import get_async_session
    import uuid
    async with get_async_session() as session:
        svc = TrustSafetyService(session)
        await svc.compute_risk_score(uuid.UUID(data["user_id"]))
    logger.info("initial_risk_score_computed", user_id=data.get("user_id"))


async def handle_create_chat_thread(data: dict):
    """Triggered by: match.created"""
    from app.backend.core.database import get_async_session
    from app.backend.models.chat_thread import ChatThread
    from sqlalchemy import select
    import uuid
    async with get_async_session() as session:
        existing = await session.execute(
            select(ChatThread).where(ChatThread.match_id == uuid.UUID(data["match_id"]))
        )
        if existing.scalar_one_or_none():
            return
        thread = ChatThread(
            match_id=uuid.UUID(data["match_id"]),
            participant_1=uuid.UUID(data["user_id_1"]),
            participant_2=uuid.UUID(data["user_id_2"]),
        )
        session.add(thread)
        await session.commit()
        logger.info("chat_thread_created", match_id=data["match_id"])


async def handle_match_notification(data: dict):
    """Triggered by: match.created"""
    from app.backend.services.notification_service import NotificationService
    from app.backend.core.database import get_async_session
    import uuid
    async with get_async_session() as session:
        notif_svc = NotificationService(session)
        for uid in [data["user_id_1"], data["user_id_2"]]:
            await notif_svc.create_notification(
                user_id=uuid.UUID(uid),
                notif_type="match",
                title="It's a Match! 💜",
                body="You have a new match. Start a conversation!",
                data={"match_id": data["match_id"]},
            )


async def handle_moderate_message(data: dict):
    """Triggered by: message.sent"""
    from app.backend.websocket.handlers import moderate_message_async
    await moderate_message_async(
        data["message_id"], data["content"], data["thread_id"], data["sender_id"]
    )


async def handle_risk_recalculation(data: dict):
    """Triggered by: report.created"""
    from app.backend.services.trust_safety_service import TrustSafetyService
    from app.backend.core.database import get_async_session
    import uuid
    async with get_async_session() as session:
        svc = TrustSafetyService(session)
        await svc.compute_risk_score(uuid.UUID(data["reported_user_id"]))


async def handle_moderator_alert(data: dict):
    """Triggered by: report.created, safety.sos"""
    from app.backend.services.notification_service import NotificationService
    from app.backend.core.database import get_async_session
    from app.backend.models.user import User
    from sqlalchemy import select
    async with get_async_session() as session:
        mods = await session.execute(select(User).where(User.role.in_(['moderator', 'admin'])))
        mods = mods.scalars().all()
        notif_svc = NotificationService(session)
        for mod in mods:
            await notif_svc.create_notification(
                user_id=mod.id,
                notif_type="moderator_alert",
                title="New Report",
                body=f"Report type: {data.get('reason', 'unknown')}",
                data=data,
            )


async def handle_activate_subscription(data: dict):
    """Triggered by: payment.completed"""
    from app.backend.services.payment_service import PaymentService
    from app.backend.core.database import get_async_session
    from app.backend.core.metrics import subscription_revenue_total
    import uuid
    async with get_async_session() as session:
        svc = PaymentService(session)
        await svc.activate_subscription(
            user_id=uuid.UUID(data["user_id"]),
            plan=data["plan"],
        )
    subscription_revenue_total.labels(
        plan=data.get("plan", "unknown"),
        currency=data.get("currency", "INR")
    ).inc(float(data.get("amount", 0)))


async def handle_payment_notification(data: dict):
    """Triggered by: payment.completed"""
    from app.backend.services.notification_service import NotificationService
    from app.backend.core.database import get_async_session
    import uuid
    async with get_async_session() as session:
        notif_svc = NotificationService(session)
        await notif_svc.create_notification(
            user_id=uuid.UUID(data["user_id"]),
            notif_type="payment",
            title="Subscription Activated! ✨",
            body=f"Your {data.get('plan','').capitalize()} plan is now active.",
            data=data,
        )


async def handle_sms_emergency_contact(data: dict):
    """Triggered by: safety.sos, safety.checkin_missed"""
    from app.backend.services.sms_service import SMSService
    sms = SMSService()
    phone = data.get("emergency_contact_phone")
    name = data.get("emergency_contact_name", "")
    loc = ""
    if data.get("latitude") and data.get("longitude"):
        loc = f" Location: https://maps.google.com/?q={data['latitude']},{data['longitude']}"
    event_type = "SOS ALERT" if data.get("event_type") == "sos" else "MISSED CHECK-IN"
    message = (
        f"[Elyra {event_type}] {name or 'Your contact'} may need help.{loc} "
        f"Note: {data.get('note', 'No additional info.')} "
        "Please check on them immediately."
    )
    if phone:
        await sms.send(phone, message)
        logger.warning("emergency_sms_sent",
                       contact_phone=phone[:4] + "****",
                       event_type=event_type)


# Wire handlers
EventSubscriber.HANDLERS = {
    "user.registered":        [handle_send_email_verification,
                               handle_initial_embedding,
                               handle_score_new_profile],
    "profile.updated":        [handle_update_embedding],
    "preferences.updated":    [handle_update_embedding],
    "message.sent":           [handle_moderate_message],
    "match.created":          [handle_create_chat_thread,
                               handle_match_notification],
    "report.created":         [handle_risk_recalculation,
                               handle_moderator_alert],
    "payment.completed":      [handle_activate_subscription,
                               handle_payment_notification],
    "safety.sos":             [handle_sms_emergency_contact,
                               handle_moderator_alert],
    "safety.checkin_missed":  [handle_sms_emergency_contact],
}