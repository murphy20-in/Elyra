import uuid
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Enum as SQLEnum, Numeric
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship
from decimal import Decimal

from app.backend.models.base import Base, TimestampMixin


class Subscription(Base, TimestampMixin):
    __tablename__ = "subscriptions"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    tier = Column(
        SQLEnum("free", "plus", "premium", "elite", name="subscription_tier"),
        default="free",
        nullable=False,
    )
    status = Column(
        SQLEnum(
            "active", "cancelled", "expired", "paused", name="subscription_status"
        ),
        default="active",
        nullable=False,
    )
    started_at = Column(DateTime(timezone=True), server_default="now()", nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    auto_renew = Column(Boolean, default=True)

    __table_args__ = (
        Index("idx_subscription_user_id", "user_id"),
        Index("idx_subscription_status", "status"),
        Index("idx_subscription_expires_at", "expires_at"),
    )

    user = relationship("User", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription")