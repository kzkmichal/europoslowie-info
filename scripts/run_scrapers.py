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
from scripts.scrapers.committees import CommitteesScraper
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
    parser.add_argument(
        '--skip-committees',
        action='store_true',
        help='Skip committee memberships scraping'
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
            logger.info("STEP 1/7: Scraping MEPs (Polish Members of European Parliament)")
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
            logger.info("STEP 1/7: Skipping MEPs scraping (--skip-meps)")
            logger.info("")

        # ====================================================================
        # STEP 2: Scrape and insert voting sessions
        # ====================================================================
        if not args.skip_sessions:
            logger.info("STEP 2/7: Scraping voting sessions")
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

                # Build mapping: session_number -> list of meeting day IDs for votes scraper
                session_meeting_days = {
                    s['session_number']: s.get('meeting_day_ids', [s['session_number']])
                    for s in valid_sessions
                }

                # Extend session_ids so meeting day IDs also resolve to the DB session id
                # (votes scraper stores meeting_id like "MTG-PL-2026-03-09" in each vote)
                for snum, day_ids in session_meeting_days.items():
                    db_id = session_ids.get(snum)
                    if db_id:
                        for mid in day_ids:
                            session_ids[mid] = db_id

                logger.info(f"✓ Sessions: {len(session_ids)} inserted/updated")
                logger.info("")
        else:
            logger.info("STEP 2/7: Skipping sessions scraping (--skip-sessions)")
            logger.info("")

            # Still need to get session IDs from database for votes
            # TODO: Implement fetching existing sessions from database
            logger.warning("Need to fetch existing sessions from database...")
            session_ids = {}
            session_meeting_days = {}

        # ====================================================================
        # STEP 3: Scrape and insert votes
        # ====================================================================
        if not args.skip_votes:
            logger.info("STEP 3/7: Scraping voting results")
            logger.info("-" * 70)

            if not session_ids:
                logger.warning("No sessions available. Skipping votes scraping.")
                logger.info("")
            else:
                total_votes_inserted = 0

                with VotesScraper() as votes_scraper:
                    # Scrape votes for each session (iterate session_meeting_days to
                    # avoid processing meeting_day_id aliases added to session_ids)
                    for session_number in session_meeting_days.keys():
                        logger.info(f"Processing session: {session_number}")

                        meeting_days = session_meeting_days.get(session_number, [session_number])
                        all_votes: list = []

                        for meeting_id in meeting_days:
                            logger.info(f"  Fetching voting results for {meeting_id}...")
                            day_votes = votes_scraper.scrape(meeting_id=meeting_id)
                            if day_votes:
                                all_votes.extend(day_votes)

                        votes = all_votes

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
            logger.info("STEP 3/7: Skipping votes scraping (--skip-votes)")
            logger.info("")

        # ====================================================================
        # STEP 4: Scrape and insert parliamentary questions
        # ====================================================================
        if not args.skip_questions:
            logger.info("STEP 4/7: Scraping parliamentary questions")
            logger.info("-" * 70)

            mep_ep_ids = set(DatabaseWriter.get_all_mep_ep_ids())
            if not mep_ep_ids:
                logger.warning("No MEPs in database, skipping questions scraping.")
            else:
                years = [args.year if args.year else now.year]
                known_ids = DatabaseWriter.get_existing_question_numbers(years)

                with QuestionsScraper() as questions_scraper:
                    questions = questions_scraper.scrape(
                        mep_ep_ids=mep_ep_ids,
                        years=years,
                        known_ids=known_ids,
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
            logger.info("STEP 4/7: Skipping questions scraping (--skip-questions)")
            logger.info("")

        # ====================================================================
        # STEP 5: Scrape and insert speeches
        # ====================================================================
        if not args.skip_speeches:
            logger.info("STEP 5/7: Scraping speeches")
            logger.info("-" * 70)

            mep_ep_ids_list = DatabaseWriter.get_all_mep_ep_ids()
            if not mep_ep_ids_list:
                logger.warning("No MEPs in database, skipping speeches scraping.")
            else:
                known_speech_ids = DatabaseWriter.get_existing_speech_ids(
                    args.year if args.year else now.year
                )
                with SpeechesScraper() as speeches_scraper:
                    speeches = speeches_scraper.scrape(
                        mep_ep_ids=mep_ep_ids_list,
                        year=args.year if args.year else None,
                        known_ids=known_speech_ids,
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
            logger.info("STEP 5/7: Skipping speeches scraping (--skip-speeches)")
            logger.info("")

        # ====================================================================
        # STEP 6: Scrape and insert plenary documents
        # ====================================================================
        if not args.skip_documents:
            logger.info("STEP 6/7: Scraping plenary documents")
            logger.info("-" * 70)

            mep_ep_ids_list = DatabaseWriter.get_all_mep_ep_ids()
            if not mep_ep_ids_list:
                logger.warning("No MEPs in database, skipping documents scraping.")
            else:
                known_doc_ids = DatabaseWriter.get_existing_document_ids()
                with PlenaryDocsScraper() as docs_scraper:
                    docs = docs_scraper.scrape(
                        mep_ep_ids=mep_ep_ids_list,
                        years=[year] if args.year else None,
                        known_ids=known_doc_ids,
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
            logger.info("STEP 6/7: Skipping plenary documents scraping (--skip-documents)")
            logger.info("")

        # ====================================================================
        # STEP 7: Scrape and insert committee memberships
        # ====================================================================
        if not args.skip_committees:
            logger.info("STEP 7/7: Scraping committee memberships")
            logger.info("-" * 70)

            mep_ep_ids_list = DatabaseWriter.get_all_mep_ep_ids()
            if not mep_ep_ids_list:
                logger.warning("No MEPs in database, skipping committees scraping.")
            else:
                with CommitteesScraper() as committees_scraper:
                    memberships = committees_scraper.scrape(mep_ep_ids=mep_ep_ids_list)
                    valid_memberships = committees_scraper.validate(memberships)
                    committees_scraper.print_summary()

                    if valid_memberships:
                        inserted = DatabaseWriter.upsert_committee_memberships(valid_memberships)
                        logger.info(f"✓ Committee memberships: {inserted} inserted/updated")
                    else:
                        logger.warning("No valid committee memberships scraped")

            logger.info("")
        else:
            logger.info("STEP 7/7: Skipping committee memberships scraping (--skip-committees)")
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
