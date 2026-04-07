"""Rename stars_poland -> poland_score and stars_reasoning -> poland_relevance_data.

Revision ID: 014
Revises: 013
"""

from alembic import op

revision = '014'
down_revision = '013'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE vote_items RENAME COLUMN stars_poland TO poland_score
    """)
    op.execute("""
        ALTER TABLE vote_items RENAME COLUMN stars_reasoning TO poland_relevance_data
    """)
    op.execute("DROP INDEX IF EXISTS idx_vote_items_stars")
    op.execute("""
        CREATE INDEX idx_vote_items_poland_score
        ON vote_items (poland_score DESC NULLS LAST)
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE vote_items RENAME COLUMN poland_score TO stars_poland
    """)
    op.execute("""
        ALTER TABLE vote_items RENAME COLUMN poland_relevance_data TO stars_reasoning
    """)
    op.execute("DROP INDEX IF EXISTS idx_vote_items_poland_score")
    op.execute("""
        CREATE INDEX idx_vote_items_stars
        ON vote_items (stars_poland DESC NULLS LAST)
    """)
