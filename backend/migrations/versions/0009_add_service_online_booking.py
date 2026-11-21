"""add service online booking availability

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-21 13:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "services",
        sa.Column(
            "is_available_for_online_booking",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )


def downgrade() -> None:
    op.drop_column("services", "is_available_for_online_booking")
