from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.backend.core.events import SAFETY_SOS, SAFETY_LOCATION_UPDATED, publish_event
from app.backend.models.safe_session import SafeSession
from app.backend.models.safety import SafetyEvent
from app.backend.models.user import User
from app.backend.models.profile import PublicProfile
from app.backend.models.audit import AuditLog
from app.backend.schemas.safety import SafeSessionCreate, LocationUpdate, SOSTrigger


class SafetyService:
    def __init__(self, db: AsyncSession, redis):
        self.db = db
        self.redis = redis

    async def create_safe_session(
        self,
        user_id: UUID,
        data: SafeSessionCreate,
    ) -> SafeSession:
        active_result = await self.db.execute(
            select(SafeSession).where(
                SafeSession.user_id == user_id,
                SafeSession.status == "active",
            )
        )
        if active_result.scalar_one_or_none():
            raise ValueError("Active session already exists")

        session = SafeSession(
            user_id=user_id,
            match_id=data.match_id,
            emergency_contact_name=data.emergency_contact_name,
            emergency_contact_phone=data.emergency_contact_phone,
            meeting_location=data.meeting_location,
            scheduled_at=data.scheduled_at,
            check_in_interval_min=data.check_in_interval_min,
            status="active",
            live_location_enabled=data.live_location_enabled,
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)

        return session

    async def check_in(
        self,
        session_id: UUID,
        user_id: UUID,
    ) -> SafeSession:
        result = await self.db.execute(
            select(SafeSession).where(SafeSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise ValueError("Session not found")

        if str(session.user_id) != str(user_id):
            raise ValueError("Not authorized")

        if session.status != "active":
            raise ValueError("Session is not active")

        session.last_check_in = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(session)

        return session

    async def update_location(
        self,
        session_id: UUID,
        user_id: UUID,
        data: LocationUpdate,
    ) -> None:
        result = await self.db.execute(
            select(SafeSession).where(SafeSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise ValueError("Session not found")

        if str(session.user_id) != str(user_id):
            raise ValueError("Not authorized")

        if not session.live_location_enabled:
            raise ValueError("Live location is not enabled for this session")

        session.latitude = data.latitude
        session.longitude = data.longitude
        await self.db.commit()

        await publish_event(SAFETY_LOCATION_UPDATED, {
            "session_id": str(session_id),
            "latitude": data.latitude,
            "longitude": data.longitude,
        })

    async def end_session(
        self,
        session_id: UUID,
        user_id: UUID,
    ) -> SafeSession:
        result = await self.db.execute(
            select(SafeSession).where(SafeSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise ValueError("Session not found")

        if str(session.user_id) != str(user_id):
            raise ValueError("Not authorized")

        session.status = "completed"
        session.ended_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(session)

        return session

    async def trigger_sos(
        self,
        user_id: UUID,
        data: SOSTrigger,
    ) -> None:
        safety_event = SafetyEvent(
            user_id=user_id,
            event_type="sos_triggered",
            event_metadata={
                "note": data.note,
                "latitude": data.latitude,
                "longitude": data.longitude,
            },
            latitude=data.latitude,
            longitude=data.longitude,
        )
        self.db.add(safety_event)

        emergency_contact_name = ""
        emergency_contact_phone = ""

        if data.safe_session_id:
            session_result = await self.db.execute(
                select(SafeSession).where(SafeSession.id == data.safe_session_id)
            )
            session = session_result.scalar_one_or_none()
            if session:
                emergency_contact_name = session.emergency_contact_name
                emergency_contact_phone = session.emergency_contact_phone

        if not emergency_contact_phone:
            user_result = await self.db.execute(
                select(User).where(User.id == user_id)
            )
            user = user_result.scalar_one()

            private_result = await self.db.execute(
                select(PublicProfile).where(PublicProfile.user_id == user_id)
            )
            profile = private_result.scalar_one_or_none()

            if profile:
                emergency_contact_name = profile.display_name
                emergency_contact_phone = "+91"

        from app.backend.services.sms_service import send_sos_sms

        if emergency_contact_phone:
            location_str = ""
            if data.latitude and data.longitude:
                location_str = f"https://maps.google.com/?q={data.latitude},{data.longitude}"

            await send_sos_sms(
                emergency_contact_phone,
                emergency_contact_name,
                data.latitude,
                data.longitude,
                data.note,
            )

        from app.backend.services.email_service import send_sos_email

        if emergency_contact_name and emergency_contact_phone:
            location_str = ""
            if data.latitude and data.longitude:
                location_str = f"https://maps.google.com/?q={data.latitude},{data.longitude}"
            await send_sos_email(
                emergency_contact_phone,
                emergency_contact_name,
                location_str,
                data.note or "",
            )

        if data.safe_session_id:
            session_result = await self.db.execute(
                select(SafeSession).where(SafeSession.id == data.safe_session_id)
            )
            session = session_result.scalar_one()
            session.status = "sos_triggered"

        await self.db.commit()

        await publish_event(SAFETY_SOS, {
            "user_id": str(user_id),
            "latitude": data.latitude,
            "longitude": data.longitude,
        })

        audit = AuditLog(
            actor_id=user_id,
            action="safety.sos_triggered",
            target_type="safety_event",
            target_id=safety_event.id,
        )
        self.db.add(audit)
        await self.db.commit()

    async def get_active_session(
        self,
        user_id: UUID,
    ) -> Optional[SafeSession]:
        result = await self.db.execute(
            select(SafeSession).where(
                SafeSession.user_id == user_id,
                SafeSession.status == "active",
            )
        )
        return result.scalar_one_or_none()

    async def list_sessions(
        self,
        user_id: UUID,
        page: int,
        per_page: int,
    ):
        offset = (page - 1) * per_page

        result = await self.db.execute(
            select(SafeSession)
            .where(SafeSession.user_id == user_id)
            .order_by(SafeSession.created_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        sessions = result.scalars().all()

        return {"sessions": sessions}