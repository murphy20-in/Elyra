import uuid
from sqlalchemy import Column, Text, Boolean, Float, DateTime, ForeignKey, Index, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship

from app.backend.models.base import Base, TimestampMixin


class SafetyEvent(Base, TimestampMixin):
    __tablename__ = "safety_events"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    event_type = Column(
        SQLEnum(
            "sos_triggered",
            "location_shared",
            "check_in_missed",
            "suspicious_activity",
            name="safety_event_type",
        ),
        nullable=False,
    )
    event_metadata = Column("metadata", JSONB, default={})
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    resolved = Column(Boolean, default=False)

    __table_args__ = (
        Index("idx_safety_event_user_id", "user_id"),
        Index("idx_safety_event_type", "event_type"),
        Index("idx_safety_event_resolved", "resolved"),
        Index("idx_safety_event_created_at", "created_at"),
    )

    user = relationship("User", back_populates="safety_events")


class Report(Base, TimestampMixin):
    __tablename__ = "reports"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    reported_user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    reason = Column(
        SQLEnum(
            "harassment",
            "fake_profile",
            "inappropriate_content",
            "spam",
            "threatening",
            "other",
            name="report_reason",
        ),
        nullable=False,
    )
    description = Column(Text, nullable=True)
    evidence_urls = Column(JSONB, default=[])
    status = Column(
        SQLEnum(
            "pending",
            "reviewing",
            "resolved",
            "dismissed",
            name="report_status",
        ),
        default="pending",
        nullable=False,
    )
    reviewed_by = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_report_reported_user_id", "reported_user_id"),
        Index("idx_report_reporter_id", "reporter_id"),
        Index("idx_report_status", "status"),
        Index("idx_report_created_at", "created_at"),
    )


class Block(Base, TimestampMixin):
    __tablename__ = "blocks"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    blocker_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    blocked_user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("blocker_id", "blocked_user_id", name="uq_block_pair"),
        Index("idx_block_blocker_id", "blocker_id"),
    )