"""localities.state

Adds a `state` column so the platform can cover areas across many cities
and states (not just Mumbai). Existing rows are backfilled to Maharashtra.

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-09
"""
import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "localities",
        sa.Column("state", sa.String(length=80), server_default="Maharashtra", nullable=False),
    )
    op.create_index("ix_localities_state", "localities", ["state"])


def downgrade() -> None:
    op.drop_index("ix_localities_state", table_name="localities")
    op.drop_column("localities", "state")
