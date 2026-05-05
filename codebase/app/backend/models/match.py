import uuid
from sqlalchemy import Float, Boolean, DateTime, ForeignKey, Index, UniqueConstraint, CheckConstraint, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship
import sqlalchemy

from app.backend.models.base import Base, TimestampMixin


class Match(Base, TimestampMixin):
    __tablename__ = "matches"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id_1 = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    user_id_2 = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    status = Column(
        SQLEnum("pending", "matched", "unmatched", "expired", name="match_status"),
        default="pending",
        nullable=False,
    )
    liked_by_1 = Column(Boolean, default=False)
    liked_by_2 = Column(Boolean, default=False)
    match_score = Column(Float, nullable=True)
    matched_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id_1", "user_id_2", name="uq_match_pair"),
        CheckConstraint("user_id_1 < user_id_2", name="ck_ordered_pair"),
        Index("idx_match_status", "status"),
        Index("idx_match_matched_at", "matched_at"),
    )

    user1 = relationship("User", foreign_keys=[user_id_1])
    user2 = relationship("User", foreign_keys=[user_id_2])
    chat_thread = relationship(
        "ChatThread",
        back_populates="match",
        uselist=False,
    )