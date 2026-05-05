import uuid
from sqlalchemy import Integer, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship

from app.backend.models.base import Base, TimestampMixin


class UserPreference(Base, TimestampMixin):
    __tablename__ = "user_preferences"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    preferred_genders = Column(JSONB, default=[])
    preferred_orientations = Column(JSONB, default=[])
    age_min = Column(Integer, default=18)
    age_max = Column(Integer, default=50)
    max_distance_km = Column(Integer, default=50)
    preferred_intents = Column(JSONB, default=[])
    deal_breakers = Column(JSONB, default={})

    user = relationship("User", back_populates="preferences")