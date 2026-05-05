import uuid
from sqlalchemy import String, Boolean, Integer, DateTime, Index, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.backend.models.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        SQLEnum("user", "premium_user", "verified_user", "moderator", "admin", name="user_role"),
        default="user",
        nullable=False,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    phone_verified = Column(Boolean, default=False, nullable=False)
    is_banned = Column(Boolean, default=False, nullable=False)
    failed_login_count = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_user_role", "role"),
        Index("idx_user_is_active", "is_active"),
        Index("idx_user_deleted_at", "deleted_at"),
    )

    public_profile = relationship(
        "PublicProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    private_profile = relationship(
        "PrivateProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    preferences = relationship(
        "UserPreference",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    embedding = relationship(
        "UserEmbedding",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    subscriptions = relationship(
        "Subscription",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    payments = relationship("Payment", back_populates="user")
    notifications = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    safety_events = relationship(
        "SafetyEvent",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    safe_sessions = relationship(
        "SafeSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    device_tokens = relationship(
        "DeviceToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )