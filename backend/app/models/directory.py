"""Verified Help models: provider profiles + text reviews (Phase 3).

Trust is community-driven: a provider's `verified` flag and
`verification_count` are derived from reviews that include mandatory text —
never from anonymous star clicks (reduces fake 5-stars).
"""
import uuid
from datetime import datetime

from geoalchemy2 import Geography
from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ProviderProfile(Base):
    """A community service provider's business profile (separate from User)."""

    __tablename__ = "provider_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    category: Mapped[str] = mapped_column(String(30), index=True)  # cook|maid|tutor|plumber|electrician|dog_walker|other
    tagline: Mapped[str] = mapped_column(String(160))
    price_range: Mapped[str | None] = mapped_column(String(80), nullable=True)
    availability: Mapped[str | None] = mapped_column(String(120), nullable=True)
    service_area_km: Mapped[float] = mapped_column(Float, default=3.0, server_default="3.0")
    location: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    verified: Mapped[bool] = mapped_column(default=False, server_default=func.false())
    verification_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(lazy="joined")  # noqa: F821
    reviews: Mapped[list["Review"]] = relationship(back_populates="provider", cascade="all, delete-orphan")  # noqa: F821


class Review(Base):
    """A verified, text-mandatory review of a provider (one per reviewer)."""

    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("provider_id", "reviewer_id", name="uq_review_provider_reviewer"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("provider_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rating: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    provider: Mapped[ProviderProfile] = relationship(back_populates="reviews")
    reviewer: Mapped["User"] = relationship(lazy="joined")  # noqa: F821
