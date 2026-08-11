"""User and locality models (Phase 1 — Foundations)."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Locality(Base):
    """A society/neighbourhood the user selects at signup.

    This is the *verified location anchor*: trust is rooted in "which locality
    are you in", not raw GPS. Lat/lng are the locality centroid used for
    geo queries when the user has no precise fix.
    """

    __tablename__ = "localities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    city: Mapped[str] = mapped_column(String(80), index=True)
    # e.g. "Maharashtra" — lets users browse/select areas beyond one city.
    state: Mapped[str] = mapped_column(
        String(80), nullable=False, server_default="Maharashtra", index=True
    )
    lat: Mapped[float] = mapped_column()
    lng: Mapped[float] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    phone_verified: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    govt_id_verified: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    # Bumped on logout / password change / reset to invalidate all issued JWTs.
    token_version: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0"), nullable=False
    )
    # individual | business | community
    role: Mapped[str] = mapped_column(
        String(20), default="individual", server_default=text("'individual'")
    )
    about: Mapped[str | None] = mapped_column(Text, nullable=True)
    locality_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("localities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    locality: Mapped[Locality | None] = relationship(lazy="joined")
