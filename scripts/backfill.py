#!/usr/bin/env python3
"""
Backfill historical voting data from the start of the EP 10th term (July 2024)
to the current month.

For each month in the date range:
  1. Uses VotingSessionsScraper to discover plenary meeting days
  2. Checks DB — skips meeting IDs already loaded
  3. Uses VotesLoader to fetch + insert votes per meeting
  4. Runs calculate_stats at the end to update monthly rankings

Usage:
    # Full backfill from term start
    python scripts/backfill.py

    # Resume from specific month (e.g. after a crash)
    python scripts/backfill.py --start-year 2025 --start-month 6

    # Preview without inserting
    python scripts/backfill.py --dry-run

    # Skip stats recalculation (useful for partial runs)
    python scripts/backfill.py --skip-stats
"""

import sys
import os
import argparse
from datetime import date
from typing import Set

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.scrapers.sessions import VotingSessionsScraper
from scripts.load_votes import VotesLoader
from scripts.processors.calculate_stats import calculate_and_save_stats
from scripts.utils.logger import setup_logger

logger = setup_logger(__name__)

# EP 10th term started July 16, 2024 — scrape from beginning of that month
TERM_START = date(2024, 7, 1)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def iter_months(start: date, end: date):
    """Yield (year, month) tuples from start month to end month inclusive."""
    y, m = start.year, start.month
    end_y, end_m = end.year, end.month
    while (y, m) <= (end_y, end_m):
        yield y, m
        m += 1
        if m > 12:
            m = 1
            y += 1


def get_loaded_meeting_ids(db_url: str, year: int, month: int) -> Set[str]:
    """
    Return meeting IDs already in voting_sessions for this year-month.

    VotesLoader stores sessions as 'MTG-PL-YYYY-MM-DD', so we can
    filter by LIKE 'MTG-PL-YYYY-MM-%'.
    """
    engine = create_engine(db_url)
    pattern = f"MTG-PL-{year}-{month:02d}-%"
    with Session(engine) as session:
        rows = session.execute(
            text("SELECT session_number FROM voting_sessions WHERE session_number LIKE :p"),
            {"p": pattern},
        ).fetchall()
    engine.dispose()
    return {row[0] for row in rows}


def discover_meeting_ids(year: int, month: int) -> list[str]:
    """
    Use VotingSessionsScraper to find plenary days for the given month.
    Returns a list of meeting IDs in 'MTG-PL-YYYY-MM-DD' format.

    We call the internal _scrape_recent_meetings() directly to get
    per-day meeting IDs before they are grouped into multi-day sessions.
    """
    with VotingSessionsScraper() as scraper:
        # _scrape_recent_meetings probes each calendar day with a single
        # lightweight GET request and returns only plenary days.
        meeting_days = scraper._scrape_recent_meetings(year, month)

    # Reconstruct the canonical meeting_id from the date field
    return [f"MTG-PL-{day['date']}" for day in meeting_days]


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Backfill historical EP plenary votes into the database"
    )
    parser.add_argument(
        "--start-year", type=int, default=TERM_START.year,
        help=f"Start year (default: {TERM_START.year})"
    )
    parser.add_argument(
        "--start-month", type=int, default=TERM_START.month,
        help=f"Start month (default: {TERM_START.month})"
    )
    parser.add_argument(
        "--end-year", type=int, default=None,
        help="End year (default: current year)"
    )
    parser.add_argument(
        "--end-month", type=int, default=None,
        help="End month (default: current month)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Show what would be scraped without inserting anything"
    )
    parser.add_argument(
        "--skip-stats", action="store_true",
        help="Skip calculate_stats at the end"
    )
    args = parser.parse_args()

    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        logger.error("DATABASE_URL is not set. Aborting.")
        return 1

    today = date.today()
    start = date(args.start_year, args.start_month, 1)
    end = date(args.end_year or today.year, args.end_month or today.month, 1)

    if start > end:
        logger.error(f"start ({start}) is after end ({end}). Aborting.")
        return 1

    months = list(iter_months(start, end))

    logger.info("=" * 70)
    logger.info("BACKFILL — European Parliament Historical Votes")
    logger.info(f"  Period : {start.strftime('%Y-%m')} → {end.strftime('%Y-%m')}")
    logger.info(f"  Months : {len(months)}")
    if args.dry_run:
        logger.info("  Mode   : DRY RUN (no data will be inserted)")
    logger.info("=" * 70)

    total_discovered = 0
    total_skipped = 0
    total_loaded = 0
    failed: list[str] = []

    for year, month in months:
        logger.info("")
        logger.info(f"┌─ {year}-{month:02d} " + "─" * 45)

        # ── 1. Check what's already in the DB ──────────────────────────────
        try:
            existing = get_loaded_meeting_ids(db_url, year, month)
        except Exception as e:
            logger.error(f"│  ✗ DB check failed: {e}")
            continue

        if existing:
            logger.info(f"│  Already in DB: {sorted(existing)}")

        # ── 2. Discover plenary days for this month ─────────────────────────
        try:
            meeting_ids = discover_meeting_ids(year, month)
        except Exception as e:
            logger.error(f"│  ✗ Session discovery failed: {e}")
            continue

        if not meeting_ids:
            logger.info(f"│  No plenary meetings found — nothing to do")
            logger.info(f"└─ done")
            continue

        logger.info(f"│  Found {len(meeting_ids)} plenary day(s): {meeting_ids}")
        total_discovered += len(meeting_ids)

        # ── 3. Load votes for each new meeting ──────────────────────────────
        loader = VotesLoader(db_url)
        try:
            for meeting_id in meeting_ids:
                if meeting_id in existing:
                    logger.info(f"│  ⏭  {meeting_id} — already loaded, skipping")
                    total_skipped += 1
                    continue

                if args.dry_run:
                    logger.info(f"│  [DRY RUN] Would load: {meeting_id}")
                    continue

                try:
                    logger.info(f"│  → Loading {meeting_id} …")
                    stats = loader.load_votes_for_meeting(meeting_id, year, month)
                    logger.info(
                        f"│  ✓ {meeting_id}: "
                        f"{stats['inserted']} votes inserted "
                        f"({stats.get('absent_calculated', 0)} absent calculated)"
                    )
                    total_loaded += 1
                except Exception as e:
                    logger.error(f"│  ✗ {meeting_id} failed: {e}")
                    failed.append(meeting_id)
        finally:
            loader.close()

        logger.info(f"└─ done")

    # ── Final summary ────────────────────────────────────────────────────────
    logger.info("")
    logger.info("=" * 70)
    logger.info("BACKFILL SUMMARY")
    logger.info(f"  Meetings discovered : {total_discovered}")
    logger.info(f"  Already in DB       : {total_skipped}")
    logger.info(f"  Newly loaded        : {total_loaded}")
    if failed:
        logger.warning(f"  Failed ({len(failed)})          : {failed}")
    logger.info("=" * 70)

    # ── Recalculate stats ────────────────────────────────────────────────────
    if not args.dry_run and not args.skip_stats:
        if total_loaded > 0:
            logger.info("")
            logger.info("Recalculating monthly stats for all MEPs …")
            try:
                calculate_and_save_stats()
                logger.info("✓ Monthly stats updated")
            except Exception as e:
                logger.error(f"✗ Stats calculation failed: {e}")
                return 1
        else:
            logger.info("No new data loaded — skipping stats recalculation")
    elif args.skip_stats:
        logger.info("Stats recalculation skipped (--skip-stats)")

    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
