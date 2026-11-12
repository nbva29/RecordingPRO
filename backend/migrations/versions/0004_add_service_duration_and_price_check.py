"""add service duration and price check

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-12 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0004'
down_revision: Union[str, Sequence[str], None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Existing rows need an initial value before the column becomes required.
    op.add_column(
        'services',
        sa.Column('duration', sa.Integer(), nullable=False, server_default='60'),
    )
    op.alter_column('services', 'duration', server_default=None)
    op.create_check_constraint(
        'ck_services_price_non_negative', 'services', 'price >= 0'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        'ck_services_price_non_negative', 'services', type_='check'
    )
    op.drop_column('services', 'duration')
