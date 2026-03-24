#!/usr/bin/env python3
"""
Populate mep_documents table with plenary documents from EP Open Data API.

Fetches REPORT_PLENARY, RESOLUTION_MOTION, RESOLUTION_MOTION_JOINT documents
for all active Polish MEPs and stores them in the mep_documents table.

Usage:
    python scripts/populate_mep_documents.py --dry-run
    python scripts/populate_mep_documents.py --mep-ep-id 257064
    python scripts/populate_mep_documents.py --year 2025
    python scripts/populate_mep_documents.py --force
"""
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.scrapers.plenary_docs import PlenaryDocsScraper
from scripts.utils.db_writer import DatabaseWriter
from scripts.utils.logger import setup_logger

logger = setup_logger(__name__)


def main():
    parser = argparse.ArgumentParser(
        description="Populate mep_documents table with EP plenary documents"
    )
    parser.add_argument(
        '--mep-ep-id',
        type=int,
        help='Only scrape a single MEP by EP numeric ID',
    )
    parser.add_argument(
        '--year',
        type=int,
        help='Only keep documents from this calendar year (client-side filter)',
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Print scraped documents without writing to database',
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Re-fetch even for MEPs that already have documents (default: skip)',
    )
    args = parser.parse_args()

    logger.info("=" * 70)
    logger.info("MEP PLENARY DOCUMENTS SCRAPING")
    logger.info("=" * 70)

    # Determine which MEPs to scrape
    if args.mep_ep_id:
        mep_ep_ids = [args.mep_ep_id]
        logger.info(f"Scraping single MEP: {args.mep_ep_id}")
    else:
        mep_ep_ids = DatabaseWriter.get_all_mep_ep_ids()
        logger.info(f"Scraping all {len(mep_ep_ids)} active MEPs")

    if not mep_ep_ids:
        logger.error("No MEPs found in database. Run MEPs scraper first.")
        return 1

    if not args.force and not args.mep_ep_id:
        # Filter out MEPs that already have documents (unless --force)
        from sqlalchemy import text
        from scripts.utils.db import get_db_session
        with get_db_session() as session:
            result = session.execute(text("""
                SELECT DISTINCT m.ep_id
                FROM mep_documents md
                JOIN meps m ON m.id = md.mep_id
            """))
            already_done = {row.ep_id for row in result}
        if already_done:
            before = len(mep_ep_ids)
            mep_ep_ids = [ep_id for ep_id in mep_ep_ids if ep_id not in already_done]
            logger.info(
                f"Skipping {before - len(mep_ep_ids)} MEPs already in DB "
                f"(use --force to re-fetch)"
            )

    if not mep_ep_ids:
        logger.info("All MEPs already have documents. Use --force to re-fetch.")
        return 0

    years = [args.year] if args.year else None

    with PlenaryDocsScraper() as scraper:
        docs = scraper.scrape(mep_ep_ids=mep_ep_ids, years=years)
        valid_docs = scraper.validate(docs)
        scraper.print_summary()

    if not valid_docs:
        logger.warning("No valid documents scraped.")
        return 0

    if args.dry_run:
        logger.info(f"[DRY RUN] Would insert {len(valid_docs)} documents:")
        for doc in valid_docs[:20]:
            logger.info(
                f"  [{doc['document_type']}] {doc['ep_document_id']} | "
                f"{doc.get('document_date', 'no date')} | "
                f"role={doc.get('role')} committee={doc.get('committee')} | "
                f"{doc['title'][:80]}"
            )
        if len(valid_docs) > 20:
            logger.info(f"  ... and {len(valid_docs) - 20} more")
        return 0

    inserted = DatabaseWriter.upsert_mep_documents(valid_docs)
    logger.info(f"✓ Done. {inserted} documents inserted/updated.")
    logger.info("=" * 70)
    return 0


if __name__ == '__main__':
    sys.exit(main())
