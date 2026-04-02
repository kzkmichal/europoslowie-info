"""Normalize votes: create vote_items table and add vote_item_id FK to votes.

vote_items holds one row per vote_number with all vote metadata.
votes is reduced to (id, vote_item_id, mep_id, vote_choice).

This migration only creates vote_items and backfills vote_item_id.
Migration 013 will drop the old columns from votes.

Revision ID: 012
Revises: 011
"""

from alembic import op

revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS vote_items (
            id                  SERIAL PRIMARY KEY,
            vote_number         VARCHAR(50) UNIQUE NOT NULL,
            session_id          INTEGER REFERENCES voting_sessions(id),
            title               TEXT NOT NULL,
            title_en            TEXT,
            date                DATE NOT NULL,
            result              VARCHAR(20),
            votes_for           INTEGER,
            votes_against       INTEGER,
            votes_abstain       INTEGER,
            document_reference  VARCHAR(100),
            document_url        TEXT,
            context_ai          TEXT,
            stars_poland        INTEGER,
            stars_reasoning     JSONB,
            arguments_for       JSONB,
            arguments_against   JSONB,
            polish_votes_for    INTEGER,
            polish_votes_against INTEGER,
            polish_votes_abstain INTEGER,
            polish_votes_absent  INTEGER,
            topic_category      VARCHAR(100),
            policy_area         VARCHAR(100),
            vote_description    TEXT,
            is_main             BOOLEAN NOT NULL DEFAULT false,
            dec_label           TEXT,
            is_representative   BOOLEAN NOT NULL DEFAULT false,
            related_count       INTEGER NOT NULL DEFAULT 0,
            created_at          TIMESTAMP DEFAULT NOW(),
            updated_at          TIMESTAMP DEFAULT NOW()
        )
    """)

    op.execute("""
        INSERT INTO vote_items (
            vote_number, session_id, title, title_en, date, result,
            votes_for, votes_against, votes_abstain,
            document_reference, document_url, context_ai,
            stars_poland, stars_reasoning, arguments_for, arguments_against,
            polish_votes_for, polish_votes_against, polish_votes_abstain, polish_votes_absent,
            topic_category, policy_area, vote_description,
            is_main, dec_label, is_representative, related_count,
            created_at, updated_at
        )
        SELECT DISTINCT ON (vote_number)
            vote_number, session_id, title, title_en, date, result,
            votes_for, votes_against, votes_abstain,
            document_reference, document_url, context_ai,
            stars_poland, stars_reasoning, arguments_for, arguments_against,
            polish_votes_for, polish_votes_against, polish_votes_abstain, polish_votes_absent,
            topic_category, policy_area, vote_description,
            is_main, dec_label, is_representative, related_count,
            created_at, updated_at
        FROM votes
        WHERE vote_number IS NOT NULL
        ORDER BY vote_number, id
        ON CONFLICT (vote_number) DO NOTHING
    """)

    op.execute("""
        ALTER TABLE votes ADD COLUMN IF NOT EXISTS vote_item_id INTEGER REFERENCES vote_items(id)
    """)

    op.execute("""
        UPDATE votes SET vote_item_id = vi.id
        FROM vote_items vi
        WHERE votes.vote_number = vi.vote_number
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_vote_items_date
        ON vote_items (date DESC)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_vote_items_is_representative
        ON vote_items (is_representative, date DESC)
        WHERE is_representative = true
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_vote_items_topic
        ON vote_items (topic_category)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_vote_items_session
        ON vote_items (session_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_vote_items_stars
        ON vote_items (stars_poland DESC NULLS LAST)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_votes_vote_item_id
        ON votes (vote_item_id)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_votes_vote_item_id")
    op.execute("DROP INDEX IF EXISTS idx_vote_items_stars")
    op.execute("DROP INDEX IF EXISTS idx_vote_items_session")
    op.execute("DROP INDEX IF EXISTS idx_vote_items_topic")
    op.execute("DROP INDEX IF EXISTS idx_vote_items_is_representative")
    op.execute("DROP INDEX IF EXISTS idx_vote_items_date")
    op.execute("ALTER TABLE votes DROP COLUMN IF EXISTS vote_item_id")
    op.execute("DROP TABLE IF EXISTS vote_items")
