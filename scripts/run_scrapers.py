#!/usr/bin/env python3
"""
Main script to run all scrapers and populate database.

This script orchestrates the complete scraping process:
1. Scrapes MEPs (Polish Members of European Parliament)
2. Scrapes voting sessions for a given period
3. Scrapes voting results for each session
4. Inserts all data into PostgreSQL database

Usage:
    python scripts/run_scrapers.py
    python scripts/run_scrapers.py --year 2024 --month 11
    python scripts/run_scrapers.py --session "2024-11-I"
"""
import sys
import argparse
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.scrapers.meps import MEPsScraper
from scripts.scrapers.sessions import VotingSessionsScraper
from scripts.scrapers.votes import VotesScraper
from scripts.scrapers.questions import QuestionsScraper
from scripts.scrapers.speeches import SpeechesScraper
from scripts.scrapers.plenary_docs import PlenaryDocsScraper
from scripts.utils.db_writer import DatabaseWriter
from scripts.utils.logger import setup_logger

logger = setup_logger(__name__)


def main():
    """Main orchestration function."""
    parser = argparse.ArgumentParser(
        description="Run European Parliament scrapers"
    )
    parser.add_argument(
        '--year',
        type=int,
        help='Year to scrape (default: current year)'
    )
    parser.add_argument(
        '--month',
        type=int,
        help='Month to scrape (default: current month)'
    )
    parser.add_argument(
        '--session',
        type=str,
        help='Specific session to scrape (e.g., "2024-11-I")'
    )
    parser.add_argument(
        '--skip-meps',
        action='store_true',
        help='Skip MEPs scraping (use if MEPs already in database)'
    )
    parser.add_argument(
        '--skip-sessions',
        action='store_true',
        help='Skip sessions scraping'
    )
    parser.add_argument(
        '--skip-votes',
        action='store_true',
        help='Skip votes scraping'
    )
    parser.add_argument(
        '--skip-questions',
        action='store_true',
        help='Skip parliamentary questions scraping'
    )
    parser.add_argument(
        '--skip-speeches',
        action='store_true',
        help='Skip speeches scraping'
    )
    parser.add_argument(
        '--skip-documents',
        action='store_true',
        help='Skip plenary documents scraping'
    )

    args = parser.parse_args()

    # Determine year/month
    now = datetime.now()
    year = args.year or now.year
    month = args.month or now.month

    logger.info("=" * 70)
    logger.info("EUROPEAN PARLIAMENT DATA SCRAPING")
    logger.info("=" * 70)
    logger.info(f"Date: {datetime.now().isoformat()}")
    logger.info(f"Target period: {year}-{month:02d}")
    if args.session:
        logger.info(f"Specific session: {args.session}")
    logger.info("=" * 70)

    try:
        # ====================================================================
        # STEP 1: Scrape and insert MEPs
        # ====================================================================
        if not args.skip_meps:
            logger.info("")
            logger.info("STEP 1/6: Scraping MEPs (Polish Members of European Parliament)")
            logger.info("-" * 70)

            with MEPsScraper() as meps_scraper:
                # Scrape MEPs
                logger.info("Fetching MEPs data from European Parliament...")
                meps = meps_scraper.scrape(term=10)

                # Validate
                logger.info("Validating MEP data...")
                valid_meps = meps_scraper.validate(meps)

                # Print summary
                meps_scraper.print_summary()

                if not valid_meps:
                    logger.error("No valid MEPs scraped! Aborting.")
                    return 1

                # Insert into database
                logger.info("Inserting MEPs into database...")
                inserted_count = DatabaseWriter.upsert_meps(valid_meps)

                logger.info(f"✓ MEPs: {inserted_count} inserted/updated")
                logger.info("")
        else:
            logger.info("STEP 1/6: Skipping MEPs scraping (--skip-meps)")
            logger.info("")

        # ====================================================================
        # STEP 2: Scrape and insert voting sessions
        # ====================================================================
        if not args.skip_sessions:
            logger.info("STEP 2/6: Scraping voting sessions")
            logger.info("-" * 70)

            with VotingSessionsScraper() as sessions_scraper:
                # Scrape sessions
                logger.info(f"Fetching sessions for {year}-{month:02d}...")
                sessions = sessions_scraper.scrape(year=year, month=month)

                # Validate
                logger.info("Validating session data...")
                valid_sessions = sessions_scraper.validate(sessions)

                # Print summary
                sessions_scraper.print_summary()

                if not valid_sessions:
                    logger.warning(
                        f"No sessions found for {year}-{month:02d}. "
                        f"This is normal if no plenary session occurred that month."
                    )
                    logger.info("")
                    logger.info("=" * 70)
                    logger.info("SCRAPING COMPLETED (NO DATA FOR THIS PERIOD)")
                    logger.info("=" * 70)
                    return 0

                # Insert into database
                logger.info("Inserting sessions into database...")
                session_ids = DatabaseWriter.upsert_voting_sessions(valid_sessions)

                logger.info(f"✓ Sessions: {len(session_ids)} inserted/updated")
                logger.info("")
        else:
            logger.info("STEP 2/6: Skipping sessions scraping (--skip-sessions)")
            logger.info("")

            # Still need to get session IDs from database for votes
            # TODO: Implement fetching existing sessions from database
            logger.warning("Need to fetch existing sessions from database...")
            session_ids = {}

        # ====================================================================
        # STEP 3: Scrape and insert votes
        # ====================================================================
        if not args.skip_votes:
            logger.info("STEP 3/6: Scraping voting results")
            logger.info("-" * 70)

            if not session_ids:
                logger.warning("No sessions available. Skipping votes scraping.")
                logger.info("")
            else:
                total_votes_inserted = 0

                with VotesScraper() as votes_scraper:
                    # Scrape votes for each session
                    for session_number in session_ids.keys():
                        logger.info(f"Processing session: {session_number}")
                        logger.info("  Fetching voting results...")

                        # Scrape votes
                        votes = votes_scraper.scrape(session_number=session_number)

                        if not votes:
                            logger.warning(
                                f"  No votes found for session {session_number}"
                            )
                            continue

                        # Validate
                        logger.info("  Validating vote data...")
                        valid_votes = votes_scraper.validate(votes)

                        if not valid_votes:
                            logger.warning("  No valid votes after validation")
                            continue

                        logger.info(f"  Valid votes: {len(valid_votes)}")

                        # Insert into database
                        logger.info("  Inserting votes into database...")
                        inserted = DatabaseWriter.insert_votes(
                            valid_votes,
                            session_ids
                        )

                        total_votes_inserted += inserted
                        logger.info(f"  ✓ Inserted {inserted} votes for {session_number}")
                        logger.info("")

                    # Print summary
                    votes_scraper.print_summary()

                logger.info(f"✓ Total votes: {total_votes_inserted} inserted")
                logger.info("")
        else:
            logger.info("STEP 3/6: Skipping votes scraping (--skip-votes)")
            logger.info("")

        # ====================================================================
        # STEP 4: Scrape and insert parliamentary questions
        # ====================================================================
        if not args.skip_questions:
            logger.info("STEP 4/6: Scraping parliamentary questions")
            logger.info("-" * 70)

            mep_ep_ids = set(DatabaseWriter.get_all_mep_ep_ids())
            if not mep_ep_ids:
                logger.warning("No MEPs in database, skipping questions scraping.")
            else:
                # Scrape current year and previous year to catch late-entered questions
                years = list({now.year - 1, now.year})
                if args.year:
                    years = [args.year]

                with QuestionsScraper() as questions_scraper:
                    questions = questions_scraper.scrape(
                        mep_ep_ids=mep_ep_ids,
                        years=years,
                    )
                    valid_questions = questions_scraper.validate(questions)
                    questions_scraper.print_summary()

                    if valid_questions:
                        inserted = DatabaseWriter.upsert_questions(valid_questions)
                        logger.info(f"✓ Questions: {inserted} inserted/updated")
                    else:
                        logger.warning("No valid questions scraped")

            logger.info("")
        else:
            logger.info("STEP 4/6: Skipping questions scraping (--skip-questions)")
            logger.info("")

        # ====================================================================
        # STEP 5: Scrape and insert speeches
        # ====================================================================
        if not args.skip_speeches:
            logger.info("STEP 5/6: Scraping speeches")
            logger.info("-" * 70)

            mep_ep_ids_list = DatabaseWriter.get_all_mep_ep_ids()
            if not mep_ep_ids_list:
                logger.warning("No MEPs in database, skipping speeches scraping.")
            else:
                with SpeechesScraper() as speeches_scraper:
                    speeches = speeches_scraper.scrape(
                        mep_ep_ids=mep_ep_ids_list,
                        year=args.year if args.year else None,
                    )
                    valid_speeches = speeches_scraper.validate(speeches)
                    speeches_scraper.print_summary()

                    if valid_speeches:
                        inserted = DatabaseWriter.upsert_speeches(valid_speeches)
                        logger.info(f"✓ Speeches: {inserted} inserted/updated")
                    else:
                        logger.warning("No valid speeches scraped")

            logger.info("")
        else:
            logger.info("STEP 5/6: Skipping speeches scraping (--skip-speeches)")
            logger.info("")

        # ====================================================================
        # STEP 6: Scrape and insert plenary documents
        # ====================================================================
        if not args.skip_documents:
            logger.info("STEP 6/6: Scraping plenary documents")
            logger.info("-" * 70)

            mep_ep_ids_list = DatabaseWriter.get_all_mep_ep_ids()
            if not mep_ep_ids_list:
                logger.warning("No MEPs in database, skipping documents scraping.")
            else:
                with PlenaryDocsScraper() as docs_scraper:
                    docs = docs_scraper.scrape(
                        mep_ep_ids=mep_ep_ids_list,
                        years=[year] if args.year else None,
                    )
                    valid_docs = docs_scraper.validate(docs)
                    docs_scraper.print_summary()

                    if valid_docs:
                        inserted = DatabaseWriter.upsert_mep_documents(valid_docs)
                        logger.info(f"✓ Documents: {inserted} inserted/updated")
                    else:
                        logger.warning("No valid documents scraped")

            logger.info("")
        else:
            logger.info("STEP 6/6: Skipping plenary documents scraping (--skip-documents)")
            logger.info("")

        # Backfill monthly_stats counts if any activity data was scraped
        if not args.skip_questions or not args.skip_speeches:
            logger.info("Backfilling monthly_stats counts…")
            DatabaseWriter.backfill_monthly_stats_counts()

        # ====================================================================
        # FINAL SUMMARY
        # ====================================================================
        logger.info("=" * 70)
        logger.info("✓ SCRAPING COMPLETED SUCCESSFULLY")
        logger.info("=" * 70)
        logger.info("Next steps:")
        logger.info("  1. Check database: psql $DATABASE_URL")
        logger.info("  2. Run AI processing: python scripts/run_ai_processing.py")
        logger.info("  3. Test frontend: cd frontend && npm run dev")
        logger.info("=" * 70)

        return 0

    except KeyboardInterrupt:
        logger.warning("\nScraping interrupted by user")
        return 130

    except Exception as e:
        logger.error(f"\n✗ CRITICAL ERROR: {e}", exc_info=True)
        logger.error("=" * 70)
        logger.error("SCRAPING FAILED")
        logger.error("=" * 70)
        return 1


if __name__ == "__main__":
    sys.exit(main())
