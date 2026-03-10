"""
Calculate monthly statistics for MEPs from votes data.

Logic:
- Only is_main=True votes count (one per topic, no amendments)
- Group by (mep_id, year, month) from vote date
- attendanceRate = (FOR + AGAINST + ABSTAIN) / totalVotes * 100
- rankingAmongPoles = RANK() per (year, month) by attendanceRate DESC

Run:
    cd /Users/michalkozak/Desktop/europrojekt
    python -m scripts.processors.calculate_stats
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from utils.db import get_db_session
from utils.logger import setup_logger

logger = setup_logger(__name__)


UPSERT_STATS_SQL = text("""
INSERT INTO monthly_stats (
    mep_id, year, month,
    total_votes, votes_for, votes_against, votes_abstain, votes_absent,
    attendance_rate, ranking_among_poles
)
SELECT
    mep_id,
    year,
    month,
    total_votes,
    votes_for,
    votes_against,
    votes_abstain,
    votes_absent,
    attendance_rate,
    RANK() OVER (
        PARTITION BY year, month
        ORDER BY attendance_rate DESC, total_votes DESC
    ) AS ranking_among_poles
FROM (
    SELECT
        v.mep_id,
        EXTRACT(YEAR  FROM v.date)::int AS year,
        EXTRACT(MONTH FROM v.date)::int AS month,
        COUNT(*)                                      AS total_votes,
        COUNT(*) FILTER (WHERE v.vote_choice = 'FOR')     AS votes_for,
        COUNT(*) FILTER (WHERE v.vote_choice = 'AGAINST') AS votes_against,
        COUNT(*) FILTER (WHERE v.vote_choice = 'ABSTAIN') AS votes_abstain,
        COUNT(*) FILTER (WHERE v.vote_choice = 'ABSENT')  AS votes_absent,
        ROUND(
            100.0 * COUNT(*) FILTER (WHERE v.vote_choice IN ('FOR','AGAINST','ABSTAIN'))
            / NULLIF(COUNT(*), 0),
            2
        ) AS attendance_rate
    FROM votes v
    JOIN meps m ON m.id = v.mep_id
    WHERE v.is_main = TRUE
      AND m.is_active = TRUE
    GROUP BY v.mep_id, year, month
) base
ON CONFLICT (mep_id, year, month)
DO UPDATE SET
    total_votes       = EXCLUDED.total_votes,
    votes_for         = EXCLUDED.votes_for,
    votes_against     = EXCLUDED.votes_against,
    votes_abstain     = EXCLUDED.votes_abstain,
    votes_absent      = EXCLUDED.votes_absent,
    attendance_rate   = EXCLUDED.attendance_rate,
    ranking_among_poles = EXCLUDED.ranking_among_poles;
""")


def calculate_and_save_stats() -> None:
    """Calculate monthly stats for all active MEPs and upsert into monthly_stats."""
    with get_db_session() as session:
        # Preview what will be calculated
        preview = session.execute(text("""
            SELECT
                EXTRACT(YEAR  FROM v.date)::int AS year,
                EXTRACT(MONTH FROM v.date)::int AS month,
                COUNT(DISTINCT v.mep_id) AS mep_count,
                COUNT(*) AS vote_count
            FROM votes v
            JOIN meps m ON m.id = v.mep_id
            WHERE v.is_main = TRUE AND m.is_active = TRUE
            GROUP BY year, month
            ORDER BY year DESC, month DESC
        """)).fetchall()

        if not preview:
            logger.warning("Brak głosowań is_main=True do obliczenia statystyk.")
            return

        logger.info("Okresy do obliczenia:")
        for row in preview:
            logger.info(f"  {row.year}-{row.month:02d}: {row.mep_count} posłów, {row.vote_count} głosowań")

        # Run upsert
        result = session.execute(UPSERT_STATS_SQL)
        session.commit()

        logger.info(f"✓ Statystyki obliczone i zapisane.")

        # Summary
        summary = session.execute(text("""
            SELECT year, month, COUNT(*) AS mep_count,
                   ROUND(AVG(attendance_rate), 1) AS avg_attendance,
                   MIN(ranking_among_poles) AS min_rank,
                   MAX(ranking_among_poles) AS max_rank
            FROM monthly_stats
            GROUP BY year, month
            ORDER BY year DESC, month DESC
        """)).fetchall()

        logger.info("\nPodsumowanie monthly_stats:")
        for row in summary:
            logger.info(
                f"  {row.year}-{row.month:02d}: "
                f"{row.mep_count} posłów, "
                f"śr. frekwencja {row.avg_attendance}%, "
                f"rankingi #{row.min_rank}–#{row.max_rank}"
            )


if __name__ == "__main__":
    logger.info("=== calculate_stats.py ===")
    calculate_and_save_stats()
    logger.info("Gotowe.")
