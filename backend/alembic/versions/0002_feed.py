"""feed posts, confirms, reports

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-09
"""
from alembic import op
import sqlalchemy as sa
import uuid
from geoalchemy2 import Geography
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0002"
down_revision: str = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "feed_posts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("location", Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirm_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("resolved", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("urgent", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.create_index("ix_feed_posts_category", "feed_posts", ["category"])
    op.create_index("ix_feed_posts_expires_at", "feed_posts", ["expires_at"])
    op.create_index("ix_feed_posts_user_id", "feed_posts", ["user_id"])
    op.create_index("ix_feed_posts_location", "feed_posts", ["location"], postgresql_using="gist")

    op.create_table(
        "feed_post_confirms",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("post_id", UUID(as_uuid=True), sa.ForeignKey("feed_posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("post_id", "user_id", name="uq_feed_confirm_post_user"),
    )
    op.create_index("ix_feed_post_confirms_post_id", "feed_post_confirms", ["post_id"])
    op.create_index("ix_feed_post_confirms_user_id", "feed_post_confirms", ["user_id"])

    op.create_table(
        "reports",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("reporter_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_type", sa.String(20), nullable=False),
        sa.Column("target_id", UUID(as_uuid=True), nullable=False),
        sa.Column("reason", sa.String(300), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_reports_target", "reports", ["target_id"])


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_table("feed_post_confirms")
    op.drop_table("feed_posts")
