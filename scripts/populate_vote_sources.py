#!/usr/bin/env python3
"""
Populate vote_sources table with source links for all votes in the DB.

For each unique vote_number found in the votes table:
  Tier 1 (always, no API): builds RCV_XML, VOT_XML, and REPORT sources
  Tier 2 (opt-in, --with-procedures): fetches PROCEDURE_OEIL via EP API

Skips vote_numbers that already have sources in the DB (idempotent).

Usage:
    # Tier 1 only — fast, no API calls (~seconds for 739 votes)
    python scripts/populate_vote_sources.py

    # Tier 1 + Tier 2 — slow, ~2s per unique doc (~10-20 min for full DB)
    python scripts/populate_vote_sources.py --with-procedures

    # Preview without inserting
    python scripts/populate_vote_sources.py --dry-run

    # Process a single vote for testing
    python scripts/populate_vote_sources.py --vote-number 185885

    # Force re-insert even if sources already exist (useful after bugfix)
    python scripts/populate_vote_sources.py --force
"""

import os
import sys
import argparse
from datetime import datetime
from typing import Any, Dict, List, Optional, Set

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.scrapers.sources import SourcesScraper
from scripts.utils.db_models import VoteSource
from scripts.utils.logger import setup_logger

logger = setup_logger(__name__)


def get_votes_to_process(
    db_session: Session,
    vote_number_filter: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Query one row per unique vote_number from the votes table, joining
    session_number from voting_sessions.

    Returns only rows where vote_number is not NULL (procedural votes
    without a proper vote_number are skipped).
    """
    if vote_number_filter:
        sql = text("""
            SELECT DISTINCT ON (v.vote_number)
                v.vote_number,
                v.dec_label,
                vs.session_number
            FROM votes v
            JOIN voting_sessions vs ON v.session_id = vs.id
            WHERE v.vote_number IS NOT NULL
              AND v.vote_number = :vote_number
            ORDER BY v.vote_number, v.id
        """)
        rows = db_session.execute(
            sql, {"vote_number": vote_number_filter}
        ).fetchall()
    else:
        sql = text("""
            SELECT DISTINCT ON (v.vote_number)
                v.vote_number,
                v.dec_label,
                vs.session_number
            FROM votes v
            JOIN voting_sessions vs ON v.session_id = vs.id
            WHERE v.vote_number IS NOT NULL
            ORDER BY v.vote_number, v.id
        """)
        rows = db_session.execute(sql).fetchall()

    return [
        {
            'vote_number':    row.vote_number,
            'dec_label':      row.dec_label,
            'session_number': row.session_number,
        }
        for row in rows
    ]


def get_already_populated_vote_numbers(db_session: Session) -> Set[str]:
    """Return set of vote_numbers that already have entries in vote_sources."""
    rows = db_session.execute(
        text("SELECT DISTINCT vote_number FROM vote_sources")
    ).fetchall()
    return {row.vote_number for row in rows}


def insert_sources(
    db_session: Session,
    sources: List[Dict[str, Any]],
    dry_run: bool,
) -> int:
    """
    Insert source records into vote_sources table.

    Strips internal keys (like _doc_id) before inserting.
    Returns count of records inserted.
    """
    if not sources:
        return 0

    records = []
    now = datetime.utcnow()

    for src in sources:
        record = VoteSource(
            vote_number=src['vote_number'],
            url=src['url'],
            name=src['name'],
            source_type=src['source_type'],
            accessed_at=now,
        )
        records.append(record)

    if dry_run:
        for r in records:
            logger.info(
                f"  [dry-run] {r.source_type:<16} {r.vote_number} → {r.url}"
            )
        return len(records)

    db_session.bulk_save_objects(records)
    db_session.commit()
    return len(records)


def run(
    db_url: str,
    with_procedures: bool = False,
    dry_run: bool = False,
    vote_number_filter: Optional[str] = None,
    force: bool = False,
) -> None:
    """Main processing loop."""

    engine = create_engine(db_url)
    db_session = Session(engine)

    try:
        logger.info("=" * 70)
        logger.info("populate_vote_sources — starting")
        logger.info(f"  with_procedures = {with_procedures}")
        logger.info(f"  dry_run         = {dry_run}")
        logger.info(f"  force           = {force}")
        if vote_number_filter:
            logger.info(f"  vote_number     = {vote_number_filter}")
        logger.info("=" * 70)

        # 1. Load votes to process
        votes = get_votes_to_process(db_session, vote_number_filter)
        logger.info(f"Found {len(votes)} unique vote_numbers in DB")

        # 2. Determine which already have sources (skip unless --force)
        if not force:
            already_done = get_already_populated_vote_numbers(db_session)
            votes = [v for v in votes if v['vote_number'] not in already_done]
            logger.info(
                f"{len(votes)} vote_numbers need sources "
                f"({len(already_done)} already populated, skipping)"
            )

        if not votes:
            logger.info("Nothing to do.")
            return

        # 3. Process each vote
        total_inserted = 0
        proc_hits = 0
        proc_misses = 0

        with SourcesScraper() as scraper:
            for i, vote in enumerate(votes, 1):
                vote_number    = vote['vote_number']
                dec_label      = vote['dec_label']
                session_number = vote['session_number']

                if i % 50 == 0 or i == len(votes):
                    logger.info(f"Processing {i}/{len(votes)}: {vote_number}")

                # ── Tier 1 ────────────────────────────────────────────────
                sources = scraper.build_sources_from_existing(
                    vote_number=vote_number,
                    dec_label=dec_label,
                    session_number=session_number,
                )

                # ── Tier 2 (optional) ─────────────────────────────────────
                if with_procedures:
                    for src in sources:
                        if src.get('source_type') == 'REPORT' and src.get('_doc_id'):
                            proc_src = scraper.fetch_procedure_source(
                                vote_number=vote_number,
                                doc_id=src['_doc_id'],
                            )
                            if proc_src:
                                sources.append(proc_src)
                                proc_hits += 1
                            else:
                                proc_misses += 1
                            break  # Only fetch once per vote (one doc_id per vote)

                # ── Insert ────────────────────────────────────────────────
                n = insert_sources(db_session, sources, dry_run)
                total_inserted += n

        # 4. Summary
        logger.info("=" * 70)
        logger.info("populate_vote_sources — done")
        logger.info(f"  Votes processed:   {len(votes)}")
        logger.info(f"  Sources inserted:  {total_inserted}")
        if with_procedures:
            logger.info(f"  Procedure hits:    {proc_hits}")
            logger.info(f"  Procedure misses:  {proc_misses}")
        if dry_run:
            logger.info("  (dry-run — nothing was actually inserted)")
        logger.info("=" * 70)

    finally:
        db_session.close()
        engine.dispose()


def main():
    parser = argparse.ArgumentParser(
        description="Populate vote_sources table with EP document links"
    )
    parser.add_argument(
        '--with-procedures',
        action='store_true',
        help='Also fetch PROCEDURE_OEIL via EP API (slower, adds ~2s per vote)',
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Print sources without inserting into DB',
    )
    parser.add_argument(
        '--vote-number',
        type=str,
        default=None,
        help='Process only this vote_number (e.g. 185885)',
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Re-process votes that already have sources',
    )

    args = parser.parse_args()

    load_dotenv()
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("Error: DATABASE_URL not set in environment")
        sys.exit(1)

    run(
        db_url=db_url,
        with_procedures=args.with_procedures,
        dry_run=args.dry_run,
        vote_number_filter=args.vote_number,
        force=args.force,
    )


if __name__ == "__main__":
    main()
