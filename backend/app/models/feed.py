"""Nearby Right Now models: FeedPost + confirmations, plus the shared Report.

Data model per spec:
    post(id, user_id, category, text, lat, lng, created_at, expires_at,
         confirm_count, resolved_flag)
location is stored as PostGIS `geography(Point,4326)`; `urgent` is added from
the screen-03 composer (mockups win on UX).
"""
import uuid
from datetime import datetime

from geoalchemy2 import Geography
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text as sa_text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FeedPost(Base):
    __tablename__ = "feed_posts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(String(20), index=True)  # traffic|civic|safety|utility|event|other
    text: Mapped[str] = mapped_column(Text)
    location: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    confirm_count: Mapped[int] = mapped_column(Integer, default=0, server_default=sa_text("0"))
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, server_default=sa_text("false"))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    urgent: Mapped[bool] = mapped_column(Boolean, default=False, server_default=sa_text("false"))

    author: Mapped["User"] = relationship(lazy="joined")  # noqa: F821


class FeedPostConfirm(Base):
    """One user, one confirm per post — "Still happening?" votes."""

    __tablename__ = "feed_post_confirms"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_feed_confirm_post_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("feed_posts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Report(Base):
    """Abuse report for any target (feed post, request, provider profile)."""

    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # feed | request | provider
    target_type: Mapped[str] = mapped_column(String(20), nullable=False)
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    reason: Mapped[str] = mapped_column(String(300), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
