"""create users and roles

Revision ID: 0001
Revises:
Create Date: 2026-11-09 23:53:53.705763

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    roles = op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=20), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.bulk_insert(roles, [
        {'id': 1, 'name': 'client'},
        {'id': 2, 'name': 'admin'},
    ])
    op.create_table(
        'users',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('email', sa.String(length=254), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=True),
        sa.Column('phone', sa.String(length=32), nullable=True),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('users')
    op.drop_table('roles')
