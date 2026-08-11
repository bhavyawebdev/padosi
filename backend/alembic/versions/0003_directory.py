"""provider profiles and reviews

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-09
"""
from alembic import op
import sqlalchemy as sa
import uuid
from geoalchemy2 import Geography
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0003"
down_revision: str = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "provider_profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("tagline", sa.String(160), nullable=False),
        sa.Column("price_range", sa.String(80), nullable=True),
        sa.Column("availability", sa.String(120), nullable=True),
        sa.Column("service_area_km", sa.Float(), server_default="3.0", nullable=False),
        sa.Column("location", Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False),
        sa.Column("verified", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("verification_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", name="uq_provider_profile_user"),
    )
    op.create_index("ix_provider_profiles_category", "provider_profiles", ["category"])
    op.create_index("ix_provider_profiles_location", "provider_profiles", ["location"], postgresql_using="gist")

    op.create_table(
        "reviews",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("provider_id", UUID(as_uuid=True), sa.ForeignKey("provider_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reviewer_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("provider_id", "reviewer_id", name="uq_review_provider_reviewer"),
    )
    op.create_index("ix_reviews_provider_id", "reviews", ["provider_id"])
    op.create_index("ix_reviews_reviewer_id", "reviews", ["reviewer_id"])


def downgrade() -> None:
    op.drop_table("reviews")
    op.drop_table("provider_profiles")
