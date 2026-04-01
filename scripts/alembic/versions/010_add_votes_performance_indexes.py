"""Add composite performance indexes on votes table.

Fixes slow queries:
- getVotesList(): GROUP BY (title, session_id) with is_main=true + date ordering
  was doing a full sequential scan on 200k+ rows.
- getAllMEPsWithStats(): DISTINCT ON (mep_id) ORDER BY stars_poland DESC.

Revision ID: 010
Revises: 009
"""

from alembic import op

revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # getVotesList() default query: is_main=true + ORDER BY date DESC
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_votes_is_main_date
        ON votes (is_main, date DESC)
        WHERE is_main = true
    """)

    # getVotesList() with result filter (ADOPTED/REJECTED)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_votes_is_main_result_date
        ON votes (is_main, result, date DESC)
    """)

    # getVotesList() with topic category filter
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_votes_is_main_category_date
        ON votes (is_main, topic_category, date DESC)
    """)

    # getAllMEPsWithStats(): DISTINCT ON (mep_id) ORDER BY stars_poland DESC
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_votes_mep_stars_date
        ON votes (mep_id, stars_poland DESC NULLS LAST, date DESC)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_votes_is_main_date")
    op.execute("DROP INDEX IF EXISTS idx_votes_is_main_result_date")
    op.execute("DROP INDEX IF EXISTS idx_votes_is_main_category_date")
    op.execute("DROP INDEX IF EXISTS idx_votes_mep_stars_date")
