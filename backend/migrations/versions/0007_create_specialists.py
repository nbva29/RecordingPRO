"""create specialists and specialist services

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-21 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "specialists",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_specialists_organization_id"),
        "specialists",
        ["organization_id"],
        unique=False,
    )
    op.create_table(
        "specialist_services",
        sa.Column("specialist_id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["specialist_id"], ["specialists.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("specialist_id", "service_id"),
    )
    op.create_index(
        op.f("ix_specialist_services_service_id"),
        "specialist_services",
        ["service_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("specialist_services")
    op.drop_table("specialists")
