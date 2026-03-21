#!/usr/bin/env python3
"""
Quick single-month scraper for questions and speeches.

Usage:
    python scripts/scrape_month.py --year 2026 --month 1
    python scripts/scrape_month.py --year 2025 --month 11 --dry-run
"""
import sys
import argparse
from datetime import datetime, date
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.scrapers.questions import QuestionsScraper
from scripts.scrapers.speeches import SpeechesScraper
from scripts.utils.db_writer import DatabaseWriter
from scripts.utils.logger import setup_logger

logger = setup_logger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Scrape questions + speeches for one month")
    parser.add_argument('--year',  type=int, required=True)
    parser.add_argument('--month', type=int, required=True, choices=range(1, 13))
    parser.add_argument('--dry-run', action='store_true', help="Fetch data but do not write to DB")
    parser.add_argument('--skip-questions', action='store_true')
    parser.add_argument('--skip-speeches',  action='store_true')
    args = parser.parse_args()

    month_start = date(args.year, args.month, 1)
    if args.month == 12:
        month_end = date(args.year + 1, 1, 1)
    else:
        month_end = date(args.year, args.month + 1, 1)

    logger.info("=" * 60)
    logger.info(f"SINGLE-MONTH SCRAPE: {args.year}-{args.month:02d}")
    logger.info(f"Range: {month_start} – {month_end} (exclusive)")
    if args.dry_run:
        logger.info("DRY RUN — no DB writes")
    logger.info("=" * 60)

    mep_ep_ids = DatabaseWriter.get_all_mep_ep_ids()
    mep_ep_ids_set = set(mep_ep_ids)
    logger.info(f"Loaded {len(mep_ep_ids)} active Polish MEPs")

    # ── Questions ─────────────────────────────────────────────────────────────
    if not args.skip_questions:
        logger.info("")
        logger.info(f"QUESTIONS — fetching all {args.year} IDs then filtering to {args.month:02d}...")

        with QuestionsScraper() as qs:
            # Collect all IDs for the year (no month filter on API)
            all_ids = qs._collect_ids_for_year(args.year)
            logger.info(f"  {len(all_ids)} question IDs in {args.year}")

            questions = []
            for qid in all_ids:
                q = qs._fetch_question(qid, mep_ep_ids_set)
                if not q:
                    continue
                # Filter to target month
                submitted = q.get('date_submitted', '')
                if not (str(month_start) <= str(submitted) < str(month_end)):
                    continue
                questions.append(q)
                qs.stats['items_scraped'] += 1

            valid = qs.validate(questions)
            qs.print_summary()
            logger.info(f"  Polish MEP questions in {args.year}-{args.month:02d}: {len(valid)}")
            for q in valid:
                logger.info(f"    [{q['question_number']}] {q['subject'][:70]}")

            if not args.dry_run and valid:
                inserted = DatabaseWriter.upsert_questions(valid)
                logger.info(f"  ✓ Inserted/updated {inserted} questions")

    # ── Speeches ──────────────────────────────────────────────────────────────
    if not args.skip_speeches:
        logger.info("")
        logger.info(f"SPEECHES — filtering to {args.year}-{args.month:02d}...")

        with SpeechesScraper() as ss:
            all_speeches = []
            for ep_id in mep_ep_ids:
                raw = ss._scrape_for_mep(ep_id, year=args.year)
                # Further filter to exact month
                month_speeches = [
                    s for s in raw
                    if str(month_start) <= str(s.get('speech_date', '')) < str(month_end)
                ]
                all_speeches.extend(month_speeches)
                if month_speeches:
                    logger.info(f"  MEP {ep_id}: {len(month_speeches)} speeches in {args.month:02d}")
                ss.stats['items_scraped'] += len(raw)

            valid = ss.validate(all_speeches)
            ss.print_summary()
            logger.info(f"  Total speeches in {args.year}-{args.month:02d}: {len(valid)}")

            if not args.dry_run and valid:
                inserted = DatabaseWriter.upsert_speeches(valid)
                logger.info(f"  ✓ Inserted/updated {inserted} speeches")

    logger.info("")
    logger.info("=" * 60)
    logger.info("DONE")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
