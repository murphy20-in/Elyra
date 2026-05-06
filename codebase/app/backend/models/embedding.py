import uuid
from sqlalchemy import Column, String, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.backend.models.base import Base, TimestampMixin


class UserEmbedding(Base, TimestampMixin):
    __tablename__ = "user_embeddings"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    embedding = Column(Vector(384))
    source_text = Column(Text, nullable=True)
    model_version = Column(String(50), default="v1")

    __table_args__ = (Index("idx_user_embedding_user_id", "user_id"),)

    user = relationship("User", back_populates="embedding")