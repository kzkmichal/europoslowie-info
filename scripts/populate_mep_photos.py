#!/usr/bin/env python3
"""
Upload existing MEP photos from europarl.europa.eu to Supabase Storage
and update photo_url in the database.

Run once after configuring SUPABASE_URL and SUPABASE_SERVICE_KEY:
  python scripts/populate_mep_photos.py
  python scripts/populate_mep_photos.py --dry-run
  python scripts/populate_mep_photos.py --force   # re-upload even if already in storage
"""
import sys
import os
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text
from scripts.utils.db import get_db_session
from scripts.utils.storage import SupabaseStorage
from scripts.utils.logger import setup_logger

logger = setup_logger(__name__)


def main():
    parser = argparse.ArgumentParser(description='Upload MEP photos to Supabase Storage')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')
    parser.add_argument('--force', action='store_true', help='Re-upload even if photo already in storage')
    args = parser.parse_args()

    storage = SupabaseStorage()
    if not storage.enabled:
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment")
        sys.exit(1)

    with get_db_session() as session:
        rows = session.execute(text(
            "SELECT ep_id, full_name, photo_url FROM meps "
            "WHERE photo_url IS NOT NULL AND photo_url LIKE '%europarl.europa.eu%' "
            "ORDER BY full_name"
        )).fetchall()

    logger.info(f"Found {len(rows)} MEPs with EP photo URLs to migrate")

    updated = 0
    skipped = 0
    failed = 0

    for ep_id, full_name, photo_url in rows:
        if not args.force and storage.exists(ep_id):
            logger.info(f"  SKIP {full_name} — already in storage")
            skipped += 1
            continue

        if args.dry_run:
            logger.info(f"  DRY-RUN would upload: {full_name} (ep_id={ep_id})")
            updated += 1
            continue

        stored_url = storage.get_or_upload(ep_id, photo_url)
        if not stored_url:
            logger.error(f"  FAIL {full_name} (ep_id={ep_id})")
            failed += 1
            continue

        with get_db_session() as session:
            session.execute(
                text("UPDATE meps SET photo_url = :url WHERE ep_id = :ep_id"),
                {'url': stored_url, 'ep_id': ep_id}
            )
        logger.info(f"  OK   {full_name} → {stored_url}")
        updated += 1

    logger.info(f"\nDone: {updated} uploaded, {skipped} skipped, {failed} failed")


if __name__ == '__main__':
    main()
