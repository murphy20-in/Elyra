import uuid
from sqlalchemy import Column, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from app.backend.models.base import Base, TimestampMixin


class ChatThread(Base, TimestampMixin):
    __tablename__ = "chat_threads"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("matches.id"),
        unique=True,
        nullable=False,
    )
    participant_1 = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    participant_2 = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    is_active = Column(Boolean, default=True)
    is_anonymous = Column(Boolean, default=False)
    last_message_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_chat_thread_participant_1", "participant_1"),
        Index("idx_chat_thread_participant_2", "participant_2"),
        Index("idx_chat_thread_last_message_at", "last_message_at"),
    )

    match = relationship("Match", back_populates="chat_thread")
    p1_user = relationship("User", foreign_keys=[participant_1])
    p2_user = relationship("User", foreign_keys=[participant_2])