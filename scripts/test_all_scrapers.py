#!/usr/bin/env python3
"""
Test script for all scrapers.

This script tests the scrapers WITHOUT inserting data into the database.
Useful for development and testing.

Usage:
    python scripts/test_all_scrapers.py
"""
import sys
from pathlib import Path
from datetime import datetime

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.scrapers.meps import MEPsScraper
from scripts.scrapers.sessions import VotingSessionsScraper
from scripts.scrapers.votes import VotesScraper
from scripts.utils.logger import setup_logger

logger = setup_logger(__name__)


def test_meps_scraper():
    """Test MEPs scraper."""
    logger.info("=" * 70)
    logger.info("TEST 1: MEPs Scraper")
    logger.info("=" * 70)

    with MEPsScraper() as scraper:
        # Scrape
        logger.info("Scraping MEPs...")
        meps = scraper.scrape(term=10)

        # Validate
        logger.info("Validating...")
        valid_meps = scraper.validate(meps)

        # Summary
        scraper.print_summary()

        # Show sample
        if valid_meps:
            logger.info("\nSample MEP:")
            sample = valid_meps[0]
            for key, value in sample.items():
                logger.info(f"  {key}: {value}")

            logger.info(f"\n✓ Test passed: Found {len(valid_meps)} valid MEPs")
            return True
        else:
            logger.error("✗ Test failed: No valid MEPs found")
            return False


def test_sessions_scraper():
    """Test voting sessions scraper."""
    logger.info("\n" + "=" * 70)
    logger.info("TEST 2: Voting Sessions Scraper")
    logger.info("=" * 70)

    now = datetime.now()

    with VotingSessionsScraper() as scraper:
        # Scrape
        logger.info(f"Scraping sessions for {now.year}-{now.month:02d}...")
        sessions = scraper.scrape(year=now.year, month=now.month)

        # Validate
        logger.info("Validating...")
        valid_sessions = scraper.validate(sessions)

        # Summary
        scraper.print_summary()

        # Show sessions
        if valid_sessions:
            logger.info(f"\nFound {len(valid_sessions)} session(s):")
            for session in valid_sessions:
                logger.info(f"  {session['session_number']}: "
                          f"{session['start_date']} to {session['end_date']} "
                          f"({session.get('location', 'Unknown location')})")

            logger.info(f"\n✓ Test passed: Found {len(valid_sessions)} valid session(s)")
            return valid_sessions
        else:
            logger.warning("✗ No sessions found (this is OK if no plenary this month)")
            return []


def test_votes_scraper(sessions):
    """Test votes scraper."""
    logger.info("\n" + "=" * 70)
    logger.info("TEST 3: Votes Scraper")
    logger.info("=" * 70)

    if not sessions:
        # Use a mock session number
        session_number = "2024-11-I"
        logger.info(f"No real sessions available, using mock: {session_number}")
        sessions = [{'session_number': session_number}]

    with VotesScraper() as scraper:
        session = sessions[0]
        session_number = session['session_number']

        # Scrape
        logger.info(f"Scraping votes for session {session_number}...")
        votes = scraper.scrape(session_number=session_number)

        # Validate
        logger.info("Validating...")
        valid_votes = scraper.validate(votes)

        # Summary
        scraper.print_summary()

        # Show statistics
        if valid_votes:
            # Count unique votes
            unique_votes = set(v['vote_number'] for v in valid_votes)
            unique_meps = set(v.get('mep_name', v.get('mep_ep_id')) for v in valid_votes)

            logger.info(f"\nVote statistics:")
            logger.info(f"  Total vote records: {len(valid_votes)}")
            logger.info(f"  Unique votes: {len(unique_votes)}")
            logger.info(f"  Unique MEPs: {len(unique_meps)}")

            # Count by vote choice
            choices = {}
            for vote in valid_votes:
                choice = vote['vote_choice']
                choices[choice] = choices.get(choice, 0) + 1

            logger.info(f"\n  Vote choices:")
            for choice, count in choices.items():
                logger.info(f"    {choice}: {count}")

            # Show sample
            logger.info("\n  Sample vote record:")
            sample = valid_votes[0]
            for key in ['vote_number', 'title', 'date', 'result', 'mep_name', 'vote_choice']:
                value = sample.get(key, 'N/A')
                logger.info(f"    {key}: {value}")

            logger.info(f"\n✓ Test passed: Found {len(valid_votes)} valid vote records")
            return True
        else:
            logger.error("✗ Test failed: No valid votes found")
            return False


def main():
    """Run all scraper tests."""
    logger.info("=" * 70)
    logger.info("SCRAPER TESTING SUITE")
    logger.info("=" * 70)
    logger.info(f"Date: {datetime.now().isoformat()}")
    logger.info("=" * 70)
    logger.info("\nNOTE: This script tests scrapers WITHOUT database insertion")
    logger.info("Use scripts/run_scrapers.py to actually populate the database")
    logger.info("")

    results = {
        'meps': False,
        'sessions': False,
        'votes': False
    }

    try:
        # Test 1: MEPs
        results['meps'] = test_meps_scraper()

        # Test 2: Sessions
        sessions = test_sessions_scraper()
        results['sessions'] = len(sessions) > 0 if sessions is not None else False

        # Test 3: Votes
        results['votes'] = test_votes_scraper(sessions if sessions else [])

        # Final summary
        logger.info("\n" + "=" * 70)
        logger.info("TEST SUMMARY")
        logger.info("=" * 70)
        logger.info(f"MEPs Scraper:      {'✓ PASS' if results['meps'] else '✗ FAIL'}")
        logger.info(f"Sessions Scraper:  {'✓ PASS' if results['sessions'] else '⚠ NO DATA'}")
        logger.info(f"Votes Scraper:     {'✓ PASS' if results['votes'] else '✗ FAIL'}")
        logger.info("=" * 70)

        if results['meps'] and results['votes']:
            logger.info("✓ ALL CRITICAL TESTS PASSED")
            logger.info("\nNext step: Run with database insertion:")
            logger.info("  python scripts/run_scrapers.py")
            return 0
        else:
            logger.error("✗ SOME TESTS FAILED")
            return 1

    except KeyboardInterrupt:
        logger.warning("\nTests interrupted by user")
        return 130

    except Exception as e:
        logger.error(f"\n✗ TEST ERROR: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
