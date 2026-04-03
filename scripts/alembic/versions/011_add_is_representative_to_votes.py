"""Add is_representative and related_count to votes table.

is_representative: marks the single "best" vote from each (title, session_id)
group — eliminates GROUP BY + COALESCE on every /glosowania page request.

related_count: pre-computed number of sibling vote_numbers in the same group.
Stored only on the representative row.

Revision ID: 011
Revises: 010
"""

from alembic import op

revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE votes
        ADD COLUMN IF NOT EXISTS is_representative BOOLEAN NOT NULL DEFAULT false
    """)
    op.execute("""
        ALTER TABLE votes
        ADD COLUMN IF NOT EXISTS related_count INTEGER NOT NULL DEFAULT 0
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_votes_is_representative_date
        ON votes (is_representative, date DESC)
        WHERE is_representative = true
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_votes_is_representative_date")
    op.execute("ALTER TABLE votes DROP COLUMN IF EXISTS related_count")
    op.execute("ALTER TABLE votes DROP COLUMN IF EXISTS is_representative")
