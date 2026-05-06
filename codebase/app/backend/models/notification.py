import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Index, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship

from app.backend.models.base import Base, TimestampMixin


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    type = Column(
        SQLEnum("match", "message", "safety", "payment", "system", name="notification_type"),
        nullable=False,
    )
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=True)
    data = Column(JSONB, default={})
    is_read = Column(Boolean, default=False)

    __table_args__ = (
        Index("idx_notification_user_is_read", "user_id", "is_read"),
        Index("idx_notification_created_at", "created_at"),
    )

    user = relationship("User", back_populates="notifications")


class DeviceToken(Base, TimestampMixin):
    __tablename__ = "device_tokens"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    token = Column(String(500), unique=True, nullable=False)
    platform = Column(
        SQLEnum("ios", "android", "web", name="device_platform"),
        nullable=False,
    )
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_device_token_user_id", "user_id"),
        Index("idx_device_token_is_active", "is_active"),
    )

    user = relationship("User", back_populates="device_tokens")