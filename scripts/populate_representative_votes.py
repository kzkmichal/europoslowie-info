#!/usr/bin/env python3
"""
Populate is_representative and related_count for all vote_items.

Selects one representative row per (title, session_id) group using the same
priority as the old GROUP BY query:
  1. dec_label ILIKE '%całość tekstu%' / '%cały tekst%'  (final vote on full text)
  2. dec_label ILIKE '%Wstępne porozumienie%'            (provisional agreement)
  3. dec_label ILIKE '%Wniosek o odrzucenie%'            (rejection motion)
  4. MAX(vote_number) fallback

Related_count = number of distinct vote_numbers in the group minus 1.

Run after every scraping session:
  python scripts/populate_representative_votes.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from utils.db import get_db_session
from utils.logger import setup_logger

logger = setup_logger(__name__)

RESET_SQL = """
UPDATE vote_items SET is_representative = false, related_count = 0
WHERE is_main = true
"""

POPULATE_SQL = """
WITH groups AS (
    SELECT
        title,
        session_id,
        COUNT(DISTINCT vote_number)                                      AS unique_votes,
        MAX(vote_number) FILTER (
            WHERE dec_label ILIKE '%%całość tekstu%%'
               OR dec_label ILIKE '%%cały tekst%%'
        )                                                                AS final_text_vote,
        MAX(vote_number) FILTER (
            WHERE dec_label ILIKE '%%Wstępne porozumienie%%'
        )                                                                AS provisional_vote,
        MAX(vote_number) FILTER (
            WHERE dec_label ILIKE '%%Wniosek o odrzucenie%%'
        )                                                                AS rejection_vote,
        MAX(vote_number)                                                 AS fallback_vote
    FROM vote_items
    WHERE is_main = true
    GROUP BY title, session_id
),
rep_vote_numbers AS (
    SELECT
        title,
        session_id,
        GREATEST(unique_votes - 1, 0)                                   AS related_count,
        COALESCE(
            final_text_vote,
            provisional_vote,
            rejection_vote,
            fallback_vote
        )                                                                AS rep_vote_number
    FROM groups
),
rep_rows AS (
    SELECT DISTINCT ON (vi.title, vi.session_id)
        vi.id,
        rvn.related_count
    FROM vote_items vi
    JOIN rep_vote_numbers rvn
        ON vi.title = rvn.title
       AND vi.session_id = rvn.session_id
    WHERE vi.vote_number = rvn.rep_vote_number
      AND vi.is_main = true
    ORDER BY vi.title, vi.session_id, vi.id ASC
)
UPDATE vote_items
SET
    is_representative = true,
    related_count     = rep_rows.related_count
FROM rep_rows
WHERE vote_items.id = rep_rows.id
"""


def run():
    logger.info("Resetting is_representative flags...")
    with get_db_session() as session:
        session.execute(text(RESET_SQL))
        session.commit()

    logger.info("Computing representative votes...")
    with get_db_session() as session:
        result = session.execute(text(POPULATE_SQL))
        session.commit()
        logger.info(f"✓ Marked {result.rowcount} representative votes")


if __name__ == "__main__":
    run()
