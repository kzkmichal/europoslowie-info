"""Add unique constraint on committee_memberships (mep_id, committee_code, from_date).

Enables ON CONFLICT upsert in the CommitteesScraper. Without this constraint
each scraper run would create duplicate rows for the same membership.

Revision ID: 009
Revises: 008
"""

from alembic import op

revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        'uq_committee_memberships_mep_code_from',
        'committee_memberships',
        ['mep_id', 'committee_code', 'from_date'],
    )


def downgrade() -> None:
    op.drop_constraint(
        'uq_committee_memberships_mep_code_from',
        'committee_memberships',
        type_='unique',
    )
