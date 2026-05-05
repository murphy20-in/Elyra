import uuid
from sqlalchemy import String, Text, Integer, Float, Boolean, ForeignKey, Index, Enum as SQLEnum, LargeBinary
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship

from app.backend.models.base import Base, TimestampMixin


class PublicProfile(Base, TimestampMixin):
    __tablename__ = "public_profiles"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    display_name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    gender_identity = Column(String(50), nullable=False)
    sexual_orientation = Column(String(50), nullable=False)
    pronouns = Column(String(30), nullable=True)
    bio = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    profile_photo_url = Column(String(500), nullable=True)
    photos = Column(JSONB, default=[])
    intent = Column(
        SQLEnum("exploring", "serious", "discreet", "friendship", name="intent_type"),
        nullable=False,
    )
    is_visible = Column(Boolean, default=True)

    __table_args__ = (
        Index("idx_public_profile_city", "city"),
        Index("idx_public_profile_intent", "intent"),
        Index("idx_public_profile_is_visible", "is_visible"),
        Index("idx_public_profile_location", "latitude", "longitude"),
    )

    user = relationship("User", back_populates="public_profile")


class PrivateProfile(Base, TimestampMixin):
    __tablename__ = "private_profiles"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    real_name_enc = Column(LargeBinary, nullable=True)
    phone_enc = Column(LargeBinary, nullable=True)
    address_enc = Column(LargeBinary, nullable=True)
    id_document_enc = Column(LargeBinary, nullable=True)
    reveal_to = Column(JSONB, default=[])

    user = relationship("User", back_populates="private_profile")