"""create specialist schedules and appointments"""

from alembic import op
import sqlalchemy as sa


revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "work_schedules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("specialist_id", sa.Integer(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.ForeignKeyConstraint(
            ["specialist_id"], ["specialists.id"], ondelete="CASCADE"
        ),
        sa.CheckConstraint(
            "day_of_week >= 0 AND day_of_week <= 6",
            name="ck_work_schedules_day_of_week",
        ),
        sa.CheckConstraint(
            "start_time >= '00:00:00' AND end_time < '24:00:00' "
            "AND end_time > start_time",
            name="ck_work_schedules_time_range",
        ),
    )
    op.create_index(
        "ix_work_schedules_specialist_day", "work_schedules",
        ["specialist_id", "day_of_week"],
    )
    op.create_table(
        "appointments",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("client_id", sa.Uuid(), nullable=False),
        sa.Column("specialist_id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.Column("appointment_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="created"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["specialist_id"], ["specialists.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="RESTRICT"),
        sa.CheckConstraint(
            "start_time >= '00:00:00' AND end_time < '24:00:00' "
            "AND end_time > start_time",
            name="ck_appointments_time_range",
        ),
        sa.CheckConstraint(
            "status IN ('created', 'confirmed', 'completed', 'cancelled')",
            name="ck_appointments_status",
        ),
    )
    op.create_index(
        "ix_appointments_specialist_date", "appointments",
        ["specialist_id", "appointment_date"],
    )
    op.create_index(
        "ix_appointments_client_date", "appointments", ["client_id", "appointment_date"],
    )
    op.create_index("ix_appointments_service_id", "appointments", ["service_id"])


def downgrade() -> None:
    op.drop_table("appointments")
    op.drop_table("work_schedules")
