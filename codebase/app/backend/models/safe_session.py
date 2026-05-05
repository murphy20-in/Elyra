import uuid
from sqlalchemy import String, Text, Integer, Float, Boolean, DateTime, ForeignKey, Index, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from app.backend.models.base import Base, TimestampMixin


class SafeSession(Base, TimestampMixin):
    __tablename__ = "safe_sessions"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    match_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("matches.id"),
        nullable=True,
    )
    emergency_contact_name = Column(String(100), nullable=False)
    emergency_contact_phone = Column(String(20), nullable=False)
    meeting_location = Column(Text, nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    check_in_interval_min = Column(Integer, default=30)
    last_check_in = Column(DateTime(timezone=True), nullable=True)
    status = Column(
        SQLEnum(
            "active",
            "completed",
            "sos_triggered",
            "expired",
            name="safe_session_status",
        ),
        default="active",
        nullable=False,
    )
    live_location_enabled = Column(Boolean, default=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_safe_session_user_id", "user_id"),
        Index("idx_safe_session_status", "status"),
        Index("idx_safe_session_scheduled_at", "scheduled_at"),
    )

    user = relationship("User", back_populates="safe_sessions")