"""add service pricing and options

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-21 12:30:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "services",
        sa.Column(
            "discount_percent", sa.Integer(), nullable=False, server_default="0"
        ),
    )
    op.alter_column("services", "discount_percent", server_default=None)
    op.create_check_constraint(
        "ck_services_discount_percent_range",
        "services",
        "discount_percent >= 0 AND discount_percent <= 100",
    )
    op.create_table(
        "service_options",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "price >= 0", name="ck_service_options_price_non_negative"
        ),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_service_options_service_id"),
        "service_options",
        ["service_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("service_options")
    op.drop_constraint(
        "ck_services_discount_percent_range", "services", type_="check"
    )
    op.drop_column("services", "discount_percent")
