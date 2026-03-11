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

    # Tier 2 only — add PROCEDURE_OEIL for votes that have REPORT but no
    # PROCEDURE_OEIL yet (use after Tier 1 was already run for all votes)
    python scripts/populate_vote_sources.py --procedures-only

    # Tier 3 only — add OEIL_SUMMARY for votes that have PROCEDURE_OEIL but
    # no OEIL_SUMMARY yet (scrapes OEIL HTML procedure-file page)
    python scripts/populate_vote_sources.py --summaries-only

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
from collections import defaultdict
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


def get_votes_needing_summary(
    db_session: Session,
    vote_number_filter: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Return votes that have a PROCEDURE_OEIL source but no OEIL_SUMMARY yet.

    Also returns the OEIL procedure URL (to extract procedure_ref) and the
    vote date (needed to filter the right summary in the Key events table).
    """
    clauses = []
    params: Dict[str, Any] = {}

    if vote_number_filter:
        clauses.append("AND vs.vote_number = :vote_number")
        params['vote_number'] = vote_number_filter
    if from_date:
        clauses.append("AND v.date >= :from_date")
        params['from_date'] = from_date
    if to_date:
        clauses.append("AND v.date <= :to_date")
        params['to_date'] = to_date

    extra = "\n          ".join(clauses)
    sql = text(f"""
        SELECT DISTINCT ON (vs.vote_number)
            vs.vote_number,
            vs.url         AS procedure_url,
            v.date         AS vote_date
        FROM vote_sources vs
        JOIN votes v ON v.vote_number = vs.vote_number
        WHERE vs.source_type = 'PROCEDURE_OEIL'
          {extra}
          AND vs.vote_number NOT IN (
              SELECT DISTINCT vote_number
              FROM vote_sources
              WHERE source_type = 'OEIL_SUMMARY'
          )
        ORDER BY vs.vote_number, vs.id
    """)
    rows = db_session.execute(sql, params).fetchall()

    return [
        {
            'vote_number':   row.vote_number,
            'procedure_url': row.procedure_url,
            'vote_date':     row.vote_date,
        }
        for row in rows
    ]


def get_votes_needing_procedure(
    db_session: Session,
    vote_number_filter: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Return votes that have a REPORT source but no PROCEDURE_OEIL source yet.

    Used by --procedures-only mode to add only missing PROCEDURE_OEIL links
    when Tier 1 has already been run for all votes.

    Returns rows with vote_number and dec_label (needed to derive doc_id).
    """
    clauses = []
    params: Dict[str, Any] = {}

    if vote_number_filter:
        clauses.append("AND v.vote_number = :vote_number")
        params['vote_number'] = vote_number_filter
    if from_date:
        clauses.append("AND v.date >= :from_date")
        params['from_date'] = from_date
    if to_date:
        clauses.append("AND v.date <= :to_date")
        params['to_date'] = to_date

    extra = "\n              ".join(clauses)
    sql = text(f"""
        SELECT DISTINCT ON (v.vote_number)
            v.vote_number,
            v.dec_label
        FROM vote_sources vs
        JOIN votes v ON v.vote_number = vs.vote_number
        WHERE vs.source_type = 'REPORT'
          {extra}
          AND vs.vote_number NOT IN (
              SELECT DISTINCT vote_number
              FROM vote_sources
              WHERE source_type = 'PROCEDURE_OEIL'
          )
        ORDER BY v.vote_number, v.id
    """)
    rows = db_session.execute(sql, params).fetchall()

    return [
        {
            'vote_number': row.vote_number,
            'dec_label':   row.dec_label,
        }
        for row in rows
    ]


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
    procedures_only: bool = False,
    summaries_only: bool = False,
    dry_run: bool = False,
    vote_number_filter: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    force: bool = False,
) -> None:
    """Main processing loop."""

    engine = create_engine(db_url)
    db_session = Session(engine)

    try:
        logger.info("=" * 70)
        logger.info("populate_vote_sources — starting")
        logger.info(f"  with_procedures  = {with_procedures}")
        logger.info(f"  procedures_only  = {procedures_only}")
        logger.info(f"  summaries_only   = {summaries_only}")
        logger.info(f"  dry_run          = {dry_run}")
        logger.info(f"  force            = {force}")
        if vote_number_filter:
            logger.info(f"  vote_number      = {vote_number_filter}")
        if from_date:
            logger.info(f"  from_date        = {from_date}")
        if to_date:
            logger.info(f"  to_date          = {to_date}")
        logger.info("=" * 70)

        # ── --summaries-only mode: add missing OEIL_SUMMARY sources ──────────
        # Used when Tier 2 was already run. Finds votes with PROCEDURE_OEIL but
        # no OEIL_SUMMARY. Scrapes the OEIL procedure-file HTML page and extracts
        # the summary link for the vote date from the "Key events" table.
        if summaries_only:
            candidates = get_votes_needing_summary(
                db_session, vote_number_filter, from_date, to_date
            )
            logger.info(
                f"Found {len(candidates)} votes with PROCEDURE_OEIL but no OEIL_SUMMARY"
            )

            if not candidates:
                logger.info("Nothing to do.")
                return

            total_inserted = 0
            summary_hits = 0
            summary_misses = 0

            with SourcesScraper() as scraper:
                # Group vote_numbers by (procedure_ref, vote_date) so we make
                # exactly 1 HTML fetch per unique combination.
                key_to_votes: Dict[tuple, List[str]] = defaultdict(list)
                for vote in candidates:
                    proc_ref = SourcesScraper.extract_procedure_ref_from_url(
                        vote['procedure_url']
                    )
                    if not proc_ref:
                        summary_misses += 1
                        continue
                    vote_date = vote['vote_date']
                    if hasattr(vote_date, 'date'):
                        vote_date = vote_date.date()
                    key = (proc_ref, vote_date.strftime('%Y-%m-%d'))
                    key_to_votes[key].append(vote['vote_number'])

                unique_keys = list(key_to_votes.items())
                logger.info(
                    f"Unique (procedure_ref, date) combos: {len(unique_keys)} "
                    f"(from {len(candidates)} candidates)"
                )

                for i, ((proc_ref, date_str), vote_numbers) in enumerate(
                    unique_keys, 1
                ):
                    if i % 50 == 0 or i == len(unique_keys):
                        logger.info(
                            f"Processing {i}/{len(unique_keys)}: "
                            f"{proc_ref} @ {date_str}"
                        )

                    from datetime import date as _date
                    vote_date_obj = _date.fromisoformat(date_str)

                    summary_src = scraper.fetch_summary_source(
                        vote_number=vote_numbers[0],
                        procedure_ref=proc_ref,
                        vote_date=vote_date_obj,
                    )
                    if summary_src:
                        sources_to_insert = [
                            {**summary_src, 'vote_number': vn}
                            for vn in vote_numbers
                        ]
                        n = insert_sources(db_session, sources_to_insert, dry_run)
                        total_inserted += n
                        summary_hits += 1
                    else:
                        summary_misses += 1

            logger.info("=" * 70)
            logger.info("populate_vote_sources — done (summaries-only)")
            logger.info(f"  Candidates:       {len(candidates)}")
            logger.info(f"  Summaries inserted: {total_inserted}")
            logger.info(f"  Summary hits:     {summary_hits}")
            logger.info(f"  Summary misses:   {summary_misses}")
            if dry_run:
                logger.info("  (dry-run — nothing was actually inserted)")
            logger.info("=" * 70)
            return

        # ── --procedures-only mode: add missing PROCEDURE_OEIL sources ────────
        # Used when Tier 1 was already run for all votes and only Tier 2 is
        # needed. Finds votes with REPORT but no PROCEDURE_OEIL, re-derives
        # doc_id from dec_label, fetches API, inserts only PROCEDURE_OEIL rows.
        if procedures_only:
            candidates = get_votes_needing_procedure(
                db_session, vote_number_filter, from_date, to_date
            )
            logger.info(
                f"Found {len(candidates)} votes with REPORT but no PROCEDURE_OEIL"
            )

            if not candidates:
                logger.info("Nothing to do.")
                return

            total_inserted = 0
            proc_hits = 0
            proc_misses = 0

            with SourcesScraper() as scraper:
                # Group vote_numbers by doc_id so we make exactly 1 API call
                # per unique document (multiple votes can share the same doc).
                doc_id_to_votes: Dict[str, List[str]] = defaultdict(list)
                for vote in candidates:
                    dec_label = vote['dec_label']
                    doc_ref = scraper._extract_doc_ref(dec_label) if dec_label else None
                    doc_id  = scraper._doc_ref_to_doc_id(doc_ref) if doc_ref else None
                    if doc_id:
                        doc_id_to_votes[doc_id].append(vote['vote_number'])
                    else:
                        proc_misses += 1

                unique_docs = list(doc_id_to_votes.items())
                logger.info(
                    f"Unique doc_ids to fetch: {len(unique_docs)} "
                    f"(from {len(candidates)} candidates)"
                )

                for i, (doc_id, vote_numbers) in enumerate(unique_docs, 1):
                    if i % 50 == 0 or i == len(unique_docs):
                        logger.info(f"Processing {i}/{len(unique_docs)}: {doc_id}")

                    # Fetch procedure using first vote_number as the record key;
                    # then copy the result for every vote_number sharing this doc.
                    proc_src = scraper.fetch_procedure_source(
                        vote_number=vote_numbers[0],
                        doc_id=doc_id,
                    )
                    if proc_src:
                        sources_to_insert = [
                            {**proc_src, 'vote_number': vn}
                            for vn in vote_numbers
                        ]
                        n = insert_sources(db_session, sources_to_insert, dry_run)
                        total_inserted += n
                        proc_hits += 1
                    else:
                        proc_misses += 1

            logger.info("=" * 70)
            logger.info("populate_vote_sources — done (procedures-only)")
            logger.info(f"  Candidates:       {len(candidates)}")
            logger.info(f"  OEIL inserted:    {total_inserted}")
            logger.info(f"  Procedure hits:   {proc_hits}")
            logger.info(f"  Procedure misses: {proc_misses}")
            if dry_run:
                logger.info("  (dry-run — nothing was actually inserted)")
            logger.info("=" * 70)
            return

        # ── Normal Tier 1 (+ optional Tier 2) mode ───────────────────────────

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
        '--procedures-only',
        action='store_true',
        help=(
            'Fetch PROCEDURE_OEIL only for votes that already have a REPORT '
            'source but no PROCEDURE_OEIL yet. Use when Tier 1 was already run.'
        ),
    )
    parser.add_argument(
        '--summaries-only',
        action='store_true',
        help=(
            'Fetch OEIL_SUMMARY only for votes that already have PROCEDURE_OEIL '
            'but no OEIL_SUMMARY yet. Scrapes the OEIL procedure-file HTML page.'
        ),
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
        '--from-date',
        type=str,
        default=None,
        metavar='YYYY-MM-DD',
        help='Only process votes on or after this date (e.g. 2025-01-01)',
    )
    parser.add_argument(
        '--to-date',
        type=str,
        default=None,
        metavar='YYYY-MM-DD',
        help='Only process votes on or before this date (e.g. 2025-03-31)',
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
        procedures_only=args.procedures_only,
        summaries_only=args.summaries_only,
        dry_run=args.dry_run,
        vote_number_filter=args.vote_number,
        from_date=args.from_date,
        to_date=args.to_date,
        force=args.force,
    )


if __name__ == "__main__":
    main()
