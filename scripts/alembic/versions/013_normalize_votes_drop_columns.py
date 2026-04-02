"""Normalize votes: make vote_item_id NOT NULL, add unique constraint, drop old columns.

Removes all per-vote metadata columns from votes (they now live in vote_items).
Drops old indexes that referenced columns being removed.

Revision ID: 013
Revises: 012
"""

from alembic import op

revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE votes ALTER COLUMN vote_item_id SET NOT NULL
    """)

    op.execute("""
        ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_session_id_mep_id_vote_number_key
    """)
    op.execute("""
        ALTER TABLE votes ADD CONSTRAINT votes_vote_item_id_mep_id_key
        UNIQUE (vote_item_id, mep_id)
    """)

    op.execute("DROP INDEX IF EXISTS idx_votes_is_main")
    op.execute("DROP INDEX IF EXISTS idx_votes_date")
    op.execute("DROP INDEX IF EXISTS idx_votes_session")
    op.execute("DROP INDEX IF EXISTS idx_votes_is_main_date")
    op.execute("DROP INDEX IF EXISTS idx_votes_is_main_result_date")
    op.execute("DROP INDEX IF EXISTS idx_votes_is_main_category_date")
    op.execute("DROP INDEX IF EXISTS idx_votes_is_representative_date")

    op.execute("""
        ALTER TABLE votes
            DROP COLUMN IF EXISTS session_id,
            DROP COLUMN IF EXISTS vote_number,
            DROP COLUMN IF EXISTS title,
            DROP COLUMN IF EXISTS title_en,
            DROP COLUMN IF EXISTS date,
            DROP COLUMN IF EXISTS result,
            DROP COLUMN IF EXISTS votes_for,
            DROP COLUMN IF EXISTS votes_against,
            DROP COLUMN IF EXISTS votes_abstain,
            DROP COLUMN IF EXISTS document_reference,
            DROP COLUMN IF EXISTS document_url,
            DROP COLUMN IF EXISTS context_ai,
            DROP COLUMN IF EXISTS stars_poland,
            DROP COLUMN IF EXISTS stars_reasoning,
            DROP COLUMN IF EXISTS arguments_for,
            DROP COLUMN IF EXISTS arguments_against,
            DROP COLUMN IF EXISTS polish_votes_for,
            DROP COLUMN IF EXISTS polish_votes_against,
            DROP COLUMN IF EXISTS polish_votes_abstain,
            DROP COLUMN IF EXISTS polish_votes_absent,
            DROP COLUMN IF EXISTS topic_category,
            DROP COLUMN IF EXISTS policy_area,
            DROP COLUMN IF EXISTS vote_description,
            DROP COLUMN IF EXISTS is_main,
            DROP COLUMN IF EXISTS dec_label,
            DROP COLUMN IF EXISTS is_representative,
            DROP COLUMN IF EXISTS related_count,
            DROP COLUMN IF EXISTS created_at,
            DROP COLUMN IF EXISTS updated_at
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE votes
            ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES voting_sessions(id),
            ADD COLUMN IF NOT EXISTS vote_number VARCHAR(50),
            ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS title_en TEXT,
            ADD COLUMN IF NOT EXISTS date DATE,
            ADD COLUMN IF NOT EXISTS result VARCHAR(20),
            ADD COLUMN IF NOT EXISTS votes_for INTEGER,
            ADD COLUMN IF NOT EXISTS votes_against INTEGER,
            ADD COLUMN IF NOT EXISTS votes_abstain INTEGER,
            ADD COLUMN IF NOT EXISTS document_reference VARCHAR(100),
            ADD COLUMN IF NOT EXISTS document_url TEXT,
            ADD COLUMN IF NOT EXISTS context_ai TEXT,
            ADD COLUMN IF NOT EXISTS stars_poland INTEGER,
            ADD COLUMN IF NOT EXISTS stars_reasoning JSONB,
            ADD COLUMN IF NOT EXISTS arguments_for JSONB,
            ADD COLUMN IF NOT EXISTS arguments_against JSONB,
            ADD COLUMN IF NOT EXISTS polish_votes_for INTEGER,
            ADD COLUMN IF NOT EXISTS polish_votes_against INTEGER,
            ADD COLUMN IF NOT EXISTS polish_votes_abstain INTEGER,
            ADD COLUMN IF NOT EXISTS polish_votes_absent INTEGER,
            ADD COLUMN IF NOT EXISTS topic_category VARCHAR(100),
            ADD COLUMN IF NOT EXISTS policy_area VARCHAR(100),
            ADD COLUMN IF NOT EXISTS vote_description TEXT,
            ADD COLUMN IF NOT EXISTS is_main BOOLEAN NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS dec_label TEXT,
            ADD COLUMN IF NOT EXISTS is_representative BOOLEAN NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS related_count INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    """)
    op.execute("ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_vote_item_id_mep_id_key")
    op.execute("ALTER TABLE votes ALTER COLUMN vote_item_id DROP NOT NULL")
