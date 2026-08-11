"""request board tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-09
"""
from alembic import op
import sqlalchemy as sa
import uuid
from geoalchemy2 import Geography
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0004"
down_revision: str = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("location", Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False),
        sa.Column("needed_by", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), server_default="open", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_requests_user_id", "requests", ["user_id"])
    op.create_index("ix_requests_type", "requests", ["type"])
    op.create_index("ix_requests_status", "requests", ["status"])
    op.create_index("ix_requests_needed_by", "requests", ["needed_by"])
    op.create_index("ix_requests_location", "requests", ["location"], postgresql_using="gist")

    op.create_table(
        "request_replies",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("request_id", UUID(as_uuid=True), sa.ForeignKey("requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_request_replies_request_id", "request_replies", ["request_id"])
    op.create_index("ix_request_replies_user_id", "request_replies", ["user_id"])


def downgrade() -> None:
    op.drop_table("request_replies")
    op.drop_table("requests")
