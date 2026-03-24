#!/usr/bin/env python3
"""
Standalone script to scrape and populate committee memberships for all MEPs.

Usage:
    python scripts/populate_committee_memberships.py
    python scripts/populate_committee_memberships.py --dry-run
"""
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.scrapers.committees import CommitteesScraper
from scripts.utils.db_writer import DatabaseWriter
from scripts.utils.logger import setup_logger

logger = setup_logger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Populate committee memberships")
    parser.add_argument('--dry-run', action='store_true', help='Scrape but do not write to DB')
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("COMMITTEE MEMBERSHIPS SCRAPER")
    logger.info("=" * 60)

    mep_ep_ids = DatabaseWriter.get_all_mep_ep_ids()
    if not mep_ep_ids:
        logger.error("No MEPs found in database. Run MEPs scraper first.")
        return 1

    logger.info(f"Found {len(mep_ep_ids)} active MEPs")

    with CommitteesScraper() as scraper:
        memberships = scraper.scrape(mep_ep_ids=mep_ep_ids)
        valid = scraper.validate(memberships)
        scraper.print_summary()

    logger.info(f"Valid memberships: {len(valid)}")

    if args.dry_run:
        logger.info("DRY RUN — not writing to database")
        for m in valid[:10]:
            logger.info(f"  MEP {m['mep_ep_id']}: {m['committee_code']} ({m['role']}) from {m['from_date']}")
        return 0

    inserted = DatabaseWriter.upsert_committee_memberships(valid)
    logger.info(f"✓ Inserted/updated {inserted} committee memberships")
    return 0


if __name__ == '__main__':
    sys.exit(main())
