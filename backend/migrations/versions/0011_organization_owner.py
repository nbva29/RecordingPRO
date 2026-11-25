"""Associate each organization with at most one owner."""
from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("organizations", sa.Column("owner_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_organizations_owner", "organizations", "users", ["owner_id"], ["id"], ondelete="RESTRICT")
    op.create_unique_constraint("uq_organizations_owner", "organizations", ["owner_id"])

def downgrade() -> None:
    op.drop_constraint("uq_organizations_owner", "organizations", type_="unique")
    op.drop_constraint("fk_organizations_owner", "organizations", type_="foreignkey")
    op.drop_column("organizations", "owner_id")
