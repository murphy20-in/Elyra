import uuid
from sqlalchemy import String, Numeric, ForeignKey, Index, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship
from decimal import Decimal

from app.backend.models.base import Base, TimestampMixin


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    subscription_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("subscriptions.id"),
        nullable=True,
    )
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="INR")
    payment_method = Column(String(50), nullable=True)
    payment_gateway = Column(String(50), nullable=True)
    gateway_txn_id = Column(String(255), unique=True, nullable=True)
    status = Column(
        SQLEnum(
            "pending", "completed", "failed", "refunded", name="payment_status"
        ),
        default="pending",
        nullable=False,
    )

    __table_args__ = (
        Index("idx_payment_user_id", "user_id"),
        Index("idx_payment_subscription_id", "subscription_id"),
        Index("idx_payment_status", "status"),
    )

    user = relationship("User", back_populates="payments")
    subscription = relationship("Subscription", back_populates="payments")