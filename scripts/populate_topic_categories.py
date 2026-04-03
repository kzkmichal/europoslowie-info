#!/usr/bin/env python3
"""
Backfill topic_category for votes using two passes:

Pass 1 (default):
  For each unique document_reference with topic_category IS NULL:
  1. Call /plenary-documents/{doc_ref} via VotesScraper._fetch_plenary_document()
  2. Extract topic via VotesScraper._extract_topic_from_subject_matter()
  3. UPDATE votes SET topic_category = :cat WHERE document_reference = :doc_ref

Pass 2 (OEIL fallback):
  For each vote with PROCEDURE_OEIL source but still no topic_category:
  1. Extract procedure_ref from OEIL URL
  2. Scrape OEIL HTML page, find responsible committee badge (e.g. 'INTA')
  3. Map committee code via VotesScraper.SUBJECT_MATTER_MAP
  4. UPDATE votes SET topic_category = :cat WHERE vote_number = :vote_number

Usage:
    # Dry run — show what would be updated, no writes
    python scripts/populate_topic_categories.py --dry-run

    # Process at most 10 unique doc_refs (for testing)
    python scripts/populate_topic_categories.py --limit 10

    # Full backfill (may take 15–50 min for 500–1500 doc_refs at 2s/req)
    python scripts/populate_topic_categories.py

    # Pass 1 only (plenary-documents API)
    python scripts/populate_topic_categories.py --pass1-only

    # Pass 2 only (OEIL HTML fallback)
    python scripts/populate_topic_categories.py --oeil-only

    # Pass 2 dry run with limit
    python scripts/populate_topic_categories.py --oeil-only --dry-run --limit 5
"""

import os
import sys
import argparse
import time
from typing import Optional

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.scrapers.votes import VotesScraper
from scripts.scrapers.sources import SourcesScraper
from scripts.utils.logger import setup_logger

logger = setup_logger(__name__)

load_dotenv()


def get_doc_refs_to_process(db_session: Session, limit: Optional[int] = None):
    """
    Return distinct document_references for votes that have no topic_category yet.
    """
    sql = text("""
        SELECT DISTINCT document_reference
        FROM vote_items
        WHERE topic_category IS NULL
          AND document_reference IS NOT NULL
        ORDER BY document_reference
    """ + (f" LIMIT {int(limit)}" if limit else ""))
    rows = db_session.execute(sql).fetchall()
    return [row.document_reference for row in rows]


def get_oeil_votes_to_process(db_session: Session, limit: Optional[int] = None):
    """
    Return (vote_number, oeil_url) for main votes that have a PROCEDURE_OEIL
    source but still no topic_category.
    """
    sql = text("""
        SELECT DISTINCT vs.vote_number, vs.url AS oeil_url
        FROM vote_sources vs
        JOIN vote_items vi ON vi.vote_number = vs.vote_number
        WHERE vs.source_type = 'PROCEDURE_OEIL'
          AND vi.topic_category IS NULL
          AND vi.is_main = true
        ORDER BY vs.vote_number
    """ + (f" LIMIT {int(limit)}" if limit else ""))
    rows = db_session.execute(sql).fetchall()
    return [(row.vote_number, row.oeil_url) for row in rows]


def scrape_committee_from_oeil(scraper: SourcesScraper, procedure_ref: str) -> Optional[str]:
    """
    Fetch OEIL HTML page, extract the responsible committee code (e.g. 'INTA').

    The committee badge appears as:
        <span class="es_badge es_badge-committee">INTA</span>
    We take the first such badge on the page (= responsible committee).
    """
    from bs4 import BeautifulSoup

    url = f"{scraper.OEIL_HTML_BASE}?reference={procedure_ref}"
    try:
        response = scraper.http.get(
            url,
            headers={'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'},
        )
        response.raise_for_status()
    except Exception as e:
        logger.warning(f"Failed to fetch OEIL page for {procedure_ref}: {e}")
        return None

    try:
        soup = BeautifulSoup(response.text, 'lxml')
    except Exception as e:
        logger.warning(f"Failed to parse OEIL HTML for {procedure_ref}: {e}")
        return None

    badge = soup.select_one('span.es_badge-committee')
    if not badge:
        return None
    return badge.get_text(strip=True)


def run_pass1(engine, votes_scraper: VotesScraper, limit: Optional[int], dry_run: bool):
    """Pass 1: plenary-documents API → isAboutSubjectMatter."""
    with Session(engine) as db_session:
        doc_refs = get_doc_refs_to_process(db_session, limit=limit)

    logger.info(f"[Pass 1] Found {len(doc_refs)} doc_refs to process")

    updated = 0
    skipped = 0

    for i, doc_ref in enumerate(doc_refs, 1):
        logger.info(f"[Pass 1] [{i}/{len(doc_refs)}] Fetching {doc_ref} ...")

        doc_data = votes_scraper._fetch_plenary_document(doc_ref)
        if not doc_data:
            logger.info(f"  -> not found, skipping")
            skipped += 1
            time.sleep(votes_scraper.rate_limit)
            continue

        subjects = doc_data.get("isAboutSubjectMatter", [])
        topic = votes_scraper._extract_topic_from_subject_matter(subjects)

        if not topic:
            logger.info(f"  -> no subject matter found, skipping")
            skipped += 1
            time.sleep(votes_scraper.rate_limit)
            continue

        logger.info(f"  -> topic: {topic}")

        if dry_run:
            logger.info(f"  -> [DRY RUN] would UPDATE vote_items SET topic_category='{topic}' WHERE document_reference='{doc_ref}'")
        else:
            with Session(engine) as db_session:
                result = db_session.execute(
                    text("""
                        UPDATE vote_items
                        SET topic_category = :topic
                        WHERE document_reference = :doc_ref
                          AND topic_category IS NULL
                    """),
                    {"topic": topic, "doc_ref": doc_ref},
                )
                db_session.commit()
                rows_updated = result.rowcount
            logger.info(f"  -> updated {rows_updated} vote rows")
            updated += rows_updated

        time.sleep(votes_scraper.rate_limit)

    logger.info(
        f"[Pass 1] Done. Updated {updated} rows, skipped {skipped} doc_refs. "
        f"({'DRY RUN — no writes' if dry_run else 'changes committed'})"
    )
    return updated, skipped


def run_pass2(engine, votes_scraper: VotesScraper, sources_scraper: SourcesScraper,
              limit: Optional[int], dry_run: bool):
    """Pass 2: OEIL HTML fallback → responsible committee code → SUBJECT_MATTER_MAP."""
    with Session(engine) as db_session:
        rows = get_oeil_votes_to_process(db_session, limit=limit)

    logger.info(f"[Pass 2] Found {len(rows)} votes to process via OEIL HTML")

    updated = 0
    skipped = 0

    for i, (vote_number, oeil_url) in enumerate(rows, 1):
        logger.info(f"[Pass 2] [{i}/{len(rows)}] vote_number={vote_number} url={oeil_url}")

        procedure_ref = SourcesScraper.extract_procedure_ref_from_url(oeil_url)
        if not procedure_ref:
            logger.info(f"  -> could not extract procedure_ref, skipping")
            skipped += 1
            continue

        committee_code = scrape_committee_from_oeil(sources_scraper, procedure_ref)
        if not committee_code:
            logger.info(f"  -> no committee badge found for {procedure_ref}, skipping")
            skipped += 1
            time.sleep(sources_scraper.rate_limit)
            continue

        topic = votes_scraper.SUBJECT_MATTER_MAP.get(committee_code)
        if not topic:
            logger.info(f"  -> committee '{committee_code}' not in SUBJECT_MATTER_MAP, skipping")
            skipped += 1
            time.sleep(sources_scraper.rate_limit)
            continue

        logger.info(f"  -> committee={committee_code} → topic={topic}")

        if dry_run:
            logger.info(f"  -> [DRY RUN] would UPDATE vote_items SET topic_category='{topic}' WHERE vote_number='{vote_number}'")
        else:
            with Session(engine) as db_session:
                result = db_session.execute(
                    text("""
                        UPDATE vote_items
                        SET topic_category = :topic
                        WHERE vote_number = :vote_number
                          AND topic_category IS NULL
                    """),
                    {"topic": topic, "vote_number": vote_number},
                )
                db_session.commit()
                rows_updated = result.rowcount
            logger.info(f"  -> updated {rows_updated} vote rows")
            updated += rows_updated

        time.sleep(sources_scraper.rate_limit)

    logger.info(
        f"[Pass 2] Done. Updated {updated} rows, skipped {skipped} votes. "
        f"({'DRY RUN — no writes' if dry_run else 'changes committed'})"
    )
    return updated, skipped


def main():
    parser = argparse.ArgumentParser(
        description="Backfill topic_category from EP plenary-documents API and OEIL HTML"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be updated without writing to DB",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Max number of unique items to process per pass (for testing)",
    )
    parser.add_argument(
        "--pass1-only",
        action="store_true",
        help="Run only Pass 1 (plenary-documents API)",
    )
    parser.add_argument(
        "--oeil-only",
        action="store_true",
        help="Run only Pass 2 (OEIL HTML fallback)",
    )
    args = parser.parse_args()

    if args.pass1_only and args.oeil_only:
        logger.error("Cannot use --pass1-only and --oeil-only together")
        sys.exit(1)

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL not set")
        sys.exit(1)

    engine = create_engine(database_url)
    votes_scraper = VotesScraper()

    run_pass1_flag = not args.oeil_only
    run_pass2_flag = not args.pass1_only

    total_updated = 0

    if run_pass1_flag:
        updated, _ = run_pass1(engine, votes_scraper, args.limit, args.dry_run)
        total_updated += updated

    if run_pass2_flag:
        with SourcesScraper() as sources_scraper:
            updated, _ = run_pass2(engine, votes_scraper, sources_scraper, args.limit, args.dry_run)
            total_updated += updated

    logger.info(f"All passes complete. Total rows updated: {total_updated}")


if __name__ == "__main__":
    main()
