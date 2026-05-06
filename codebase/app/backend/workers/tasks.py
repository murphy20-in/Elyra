from datetime import datetime, timezone

from app.backend.workers.celery_app import celery_app
from app.backend.core.sync_database import get_sync_db
from app.backend.core.config import settings
from app.backend.models.user import User
from app.backend.models.profile import PublicProfile
from app.backend.models.embedding import UserEmbedding
from app.backend.models.subscription import Subscription
from app.backend.models.safety import Report
import httpx


@celery_app.task(bind=True, max_retries=3)
def re_embed_user(self, user_id: str):
    session = next(get_sync_db())

    try:
        profile = session.query(PublicProfile).filter(PublicProfile.user_id == user_id).first()

        if not profile:
            return {"status": "skipped", "reason": "no_profile"}

        text_to_embed = f"{profile.display_name} {profile.bio or ''} {profile.gender_identity} {profile.sexual_orientation}"

        try:
            response = httpx.post(
                f"{settings.EMBEDDING_SERVICE_URL}/embed",
                json={"text": text_to_embed},
                timeout=10.0,
            )
            if response.status_code == 200:
                embedding_data = response.json()
                embedding_vector = embedding_data.get("embedding")
            else:
                embedding_vector = None
        except Exception:
            embedding_vector = None

        existing = session.query(UserEmbedding).filter(UserEmbedding.user_id == user_id).first()

        if existing:
            if embedding_vector:
                existing.embedding = bytes.fromhex(embedding_vector)
            existing.source_text = text_to_embed
            existing.updated_at = datetime.now(timezone.utc)
        else:
            embedding = UserEmbedding(
                user_id=user_id,
                embedding=bytes.fromhex(embedding_vector) if embedding_vector else None,
                source_text=text_to_embed,
                model_version="v1",
            )
            session.add(embedding)

        session.commit()
        return {"status": "success", "user_id": user_id}

    except Exception as e:
        session.rollback()
        raise self.retry(exc=e, countdown=60)

    finally:
        session.close()


@celery_app.task(bind=True, max_retries=1)
def missed_checkin_check(self, session_id: str):
    session = next(get_sync_db())

    try:
        from app.backend.models.safe_session import SafeSession

        safe_session = session.query(SafeSession).filter(SafeSession.id == session_id).first()

        if not safe_session or safe_session.status != "active":
            return {"status": "skipped", "reason": "session_not_active"}

        interval = safe_session.check_in_interval_min or 30
        last_check = safe_session.last_check_in

        should_trigger = False
        if last_check:
            if (datetime.now(timezone.utc) - last_check).total_seconds() > interval * 60:
                should_trigger = True
        else:
            scheduled = safe_session.scheduled_at
            if scheduled and (datetime.now(timezone.utc) - scheduled).total_seconds() > interval * 60:
                should_trigger = True

        if should_trigger:
            from app.backend.models.safety import SafetyEvent

            event = SafetyEvent(
                user_id=safe_session.user_id,
                event_type="check_in_missed",
                event_metadata={"session_id": session_id},
                resolved=False,
            )
            session.add(event)

            from app.backend.services.sms_service import send_sos_sms
            send_sos_sms(
                safe_session.emergency_contact_phone,
                safe_session.emergency_contact_name,
                None,
                None,
                "Check-in missed",
            )

            safe_session.status = "expired"
            session.commit()

            return {"status": "sos_triggered", "session_id": session_id}

        return {"status": "ok", "session_id": session_id}

    except Exception as e:
        return {"status": "error", "error": str(e)}

    finally:
        session.close()


@celery_app.task
def expire_subscriptions():
    session = next(get_sync_db())

    try:
        now = datetime.now(timezone.utc)
        expired = session.query(Subscription).filter(
            Subscription.status == "active",
            Subscription.expires_at < now,
        ).all()

        for sub in expired:
            sub.status = "expired"

        session.commit()
        return {"status": "success", "expired_count": len(expired)}

    except Exception as e:
        session.rollback()
        return {"status": "error", "error": str(e)}

    finally:
        session.close()


@celery_app.task
def recompute_risk_scores():
    session = next(get_sync_db())

    try:
        from datetime import timedelta

        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

        users_with_reports = session.query(Report.reported_user_id).filter(
            Report.created_at > thirty_days_ago,
        ).distinct().all()

        for (user_id,) in users_with_reports:

            pass

        return {"status": "success", "processed": len(users_with_reports)}

    except Exception as e:
        return {"status": "error", "error": str(e)}

    finally:
        session.close()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def regenerate_embedding(self, user_id: str):
    import uuid
    from app.backend.core.config import settings
    from app.backend.core.sync_database import SyncSession
    from app.backend.models.profile import PublicProfile
    from app.backend.models.preference import UserPreference
    from sqlalchemy import select

    try:
        with SyncSession() as db:
            user_uuid = uuid.UUID(user_id)
            profile = db.execute(select(PublicProfile).where(PublicProfile.user_id == user_uuid)).scalar_one_or_none()
            prefs = db.execute(select(UserPreference).where(UserPreference.user_id == user_uuid)).scalar_one_or_none()
            if not profile:
                return

            text = (
                f"Bio: {profile.bio or ''}. "
                f"Gender: {profile.gender_identity}. "
                f"Orientation: {profile.sexual_orientation}. "
                f"Intent: {profile.intent}. "
                f"Looking for: {', '.join(prefs.preferred_genders) if prefs else ''}. "
                f"Age range: {prefs.age_min if prefs else 18}-{prefs.age_max if prefs else 50}. "
                f"City: {profile.city or ''}."
            )

            response = httpx.post(
                f"{settings.EMBEDDING_SERVICE_URL}/embed",
                json={"text": text, "user_id": user_id},
                timeout=10.0,
            )
            response.raise_for_status()
            embedding_data = response.json()

            existing = db.execute(select(UserEmbedding).where(UserEmbedding.user_id == user_uuid)).scalar_one_or_none()
            if existing:
                existing.embedding = embedding_data["embedding"]
                existing.source_text = text
                existing.model_version = "v1"
            else:
                db.add(UserEmbedding(
                    user_id=user_uuid,
                    embedding=embedding_data["embedding"],
                    source_text=text,
                    model_version="v1",
                ))
            db.commit()
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2)
def score_new_profile(self, user_id: str, email: str):
    import uuid
    from datetime import datetime, timezone
    from app.backend.core.config import settings
    from app.backend.core.sync_database import SyncSession
    from app.backend.models.profile import PublicProfile
    from app.backend.models.embedding import UserEmbedding
    from app.backend.models.audit import AuditLog
    from sqlalchemy import select
    from sqlalchemy import text

    try:
        with SyncSession() as db:
            user_uuid = uuid.UUID(user_id)
            user = db.execute(select(User).where(User.id == user_uuid)).scalar_one_or_none()
            profile = db.execute(select(PublicProfile).where(PublicProfile.user_id == user_uuid)).scalar_one_or_none()
            embedding_row = db.execute(select(UserEmbedding).where(UserEmbedding.user_id == user_uuid)).scalar_one_or_none()
            if not user or not profile:
                return

            email_domain = email.split('@')[-1] if '@' in email else ''
            account_age_days = (datetime.now(timezone.utc) - user.created_at).days
            embedding = embedding_row.embedding if embedding_row else [0.0] * 384
            photo_count = len(profile.photos or [])

            neighbors_result = db.execute(
                text("SELECT embedding FROM user_embeddings WHERE user_id != :uid ORDER BY embedding <=> :emb LIMIT 5"),
                {"uid": user_uuid, "emb": str(embedding)},
            )
            neighbor_embeddings = [list(row[0]) for row in neighbors_result]

            response = httpx.post(
                f"{settings.FAKE_PROFILE_SERVICE_URL}/score",
                json={
                    "user_id": user_id,
                    "bio": profile.bio or "",
                    "embedding": embedding,
                    "photo_count": photo_count,
                    "account_age_days": account_age_days,
                    "email_domain": email_domain,
                    "phone_country": "IN",
                    "neighbor_embeddings": neighbor_embeddings,
                },
                timeout=10.0,
            )
            response.raise_for_status()
            result = response.json()

            if result.get("fake_probability", 0.0) >= 0.7:
                user.is_active = False
                db.add(AuditLog(
                    actor_id=None,
                    action="auto.fake_profile_detected",
                    target_type="user",
                    target_id=user_uuid,
                    extra={"fake_probability": result["fake_probability"], "factors": result["factors"]},
                ))
                db.commit()
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task
def record_toxicity_score(user_id: str, toxicity_score: float):
    import redis as sync_redis
    from app.backend.core.config import settings
    r = sync_redis.from_url(settings.REDIS_URL, decode_responses=True)
    key = f"toxicity_history:{user_id}"
    r.lpush(key, str(toxicity_score))
    r.ltrim(key, 0, 49)
    r.expire(key, 2592000)