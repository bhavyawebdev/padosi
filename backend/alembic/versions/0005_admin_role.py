"""admin role + users.role check constraint

Adds the platform-level `admin` role (previously only individual/business/
community) and enforces the role values at the database level.

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-09
"""
from alembic import op

revision: str = "0005"
down_revision: str = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_users_role",
        "users",
        "role IN ('individual', 'business', 'community', 'admin')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_users_role", "users", type_="check")
