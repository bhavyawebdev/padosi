"""users and localities

Revision ID: 0001
Revises:
Create Date: 2026-08-09
"""
from alembic import op
import sqlalchemy as sa
import uuid
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostGIS powers every radius query (ST_DWithin). Requires a role with
    # CREATE privilege on the database; if the app role lacks it, this is a
    # no-op here and the feed migration (0002) will surface the failure.
    try:
        op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    except Exception:
        pass

    op.create_table(
        "localities",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("city", sa.String(80), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_localities_name", "localities", ["name"], unique=True)
    op.create_index("ix_localities_city", "localities", ["city"])

    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("phone_verified", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("govt_id_verified", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("role", sa.String(20), server_default=sa.text("'individual'"), nullable=False),
        sa.Column("about", sa.Text(), nullable=True),
        sa.Column("locality_id", UUID(as_uuid=True), sa.ForeignKey("localities.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_locality_id", "users", ["locality_id"])


def downgrade() -> None:
    op.drop_table("users")
    op.drop_table("localities")
