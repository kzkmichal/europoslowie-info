"""Add dec_label column to votes table.

dec_label stores the short subject description extracted from the DEC
activity_label, stripped of the "DOCREF - RAPPORTEUR - " prefix.

Examples:
  "A10-0244/2025 - Andrzej Buła - ust. 7/2"             → dec_label = "ust. 7/2"
  "A10-0244/2025 - Andrzej Buła - całość tekstu"          → dec_label = "całość tekstu"
  "A10-0244/2025 - Andrzej Buła - Załącznik, akapit 1/2" → dec_label = "Załącznik, akapit 1/2"

This enables the "Related votes" feature on vote detail pages:
all sub-votes sharing the same (title, session_id) are grouped and
displayed with their dec_label as a human-readable description.

Revision ID: 003
Revises: 002
Create Date: 2025-12-18
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'votes',
        sa.Column('dec_label', sa.Text(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('votes', 'dec_label')
