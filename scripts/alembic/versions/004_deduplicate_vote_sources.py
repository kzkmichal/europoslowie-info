"""Deduplicate vote_sources and add unique constraint.

vote_sources was missing a UNIQUE constraint on (vote_number, source_type, url),
which allowed duplicate rows to accumulate when populate_vote_sources.py was
run multiple times (e.g. with --force). This migration:

  1. Removes duplicate rows, keeping the one with the lowest id for each
     (vote_number, source_type, url) combination.
  2. Adds a UNIQUE constraint to prevent future duplicates.

Revision ID: 004
Revises: 003
"""

from alembic import op
import sqlalchemy as sa

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Step 0: create vote_sources if it doesn't exist yet ──────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS vote_sources (
            id SERIAL PRIMARY KEY,
            vote_number VARCHAR(50) NOT NULL,
            url TEXT NOT NULL,
            name VARCHAR(200) NOT NULL,
            source_type VARCHAR(50) NOT NULL,
            accessed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)

    # ── Step 1: delete duplicate rows, keep lowest id ────────────────────────
    op.execute("""
        DELETE FROM vote_sources
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM vote_sources
            GROUP BY vote_number, source_type, url
        )
    """)

    # ── Step 2: add unique constraint ────────────────────────────────────────
    op.create_unique_constraint(
        'uq_vote_sources_vote_type_url',
        'vote_sources',
        ['vote_number', 'source_type', 'url'],
    )


def downgrade() -> None:
    op.drop_constraint(
        'uq_vote_sources_vote_type_url',
        'vote_sources',
        type_='unique',
    )
