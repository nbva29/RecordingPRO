"""Replace password reset links with codes and limit verification attempts."""

from alembic import op
import sqlalchemy as sa


revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("uq_users_password_reset_token_hash", "users", type_="unique")
    op.alter_column(
        "users",
        "password_reset_token_hash",
        new_column_name="password_reset_code_hash",
        existing_type=sa.String(64),
        existing_nullable=True,
    )
    op.add_column(
        "users", sa.Column("password_reset_sent_at", sa.DateTime(), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column(
            "password_reset_attempts", sa.Integer(), server_default="0", nullable=False
        ),
    )
    # Previously issued links must no longer be usable.
    op.execute(
        sa.text(
            "UPDATE users SET password_reset_code_hash = NULL, "
            "password_reset_expires_at = NULL"
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE users SET password_reset_code_hash = NULL, "
            "password_reset_expires_at = NULL"
        )
    )
    op.drop_column("users", "password_reset_attempts")
    op.drop_column("users", "password_reset_sent_at")
    op.alter_column(
        "users",
        "password_reset_code_hash",
        new_column_name="password_reset_token_hash",
        existing_type=sa.String(64),
        existing_nullable=True,
    )
    op.create_unique_constraint(
        "uq_users_password_reset_token_hash", "users", ["password_reset_token_hash"]
    )
