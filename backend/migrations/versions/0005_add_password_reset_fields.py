"""Add one-time password reset token fields to users."""

from alembic import op
import sqlalchemy as sa


revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("password_reset_token_hash", sa.String(64), nullable=True)
    )
    op.add_column(
        "users", sa.Column("password_reset_expires_at", sa.DateTime(), nullable=True)
    )
    op.create_unique_constraint(
        "uq_users_password_reset_token_hash", "users", ["password_reset_token_hash"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_users_password_reset_token_hash", "users", type_="unique")
    op.drop_column("users", "password_reset_expires_at")
    op.drop_column("users", "password_reset_token_hash")
