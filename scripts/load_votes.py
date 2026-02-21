#!/usr/bin/env python3
"""
Data loading script for votes.

This script:
1. Runs the votes scraper for a meeting
2. Maps person_id (EP ID) to mep_id (database ID)
3. Calculates ABSENT votes for Polish MEPs
4. Creates/finds voting_session
5. Batch inserts votes into database

Usage:
    python scripts/load_votes.py MTG-PL-2025-12-15
    python scripts/load_votes.py MTG-PL-2024-12-16 --year 2024
"""

import os
import sys
import argparse
from datetime import datetime, date
from typing import Dict, List, Optional, Set
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.scrapers.votes import VotesScraper
from scripts.utils.db_models import MEP, VotingSession, Vote, Base


class VotesLoader:
    """Loads scraped vote data into database."""

    def __init__(self, db_url: str):
        """
        Initialize votes loader.

        Args:
            db_url: Database connection URL
        """
        self.engine = create_engine(db_url)
        self.session = Session(self.engine)

        # Cache for person_id → mep_id mapping
        self._mep_id_cache: Dict[int, int] = {}

        # Cache for all Polish MEP IDs
        self._polish_mep_ids: Optional[Set[int]] = None

    def load_votes_for_meeting(
        self,
        meeting_id: str,
        year: Optional[int] = None,
        month: Optional[int] = None
    ) -> Dict[str, int]:
        """
        Load votes for a meeting into database.

        Args:
            meeting_id: Meeting ID (e.g., 'MTG-PL-2025-12-15')
            year: Year (optional)
            month: Month (optional)

        Returns:
            Dictionary with statistics
        """
        print(f"\n{'='*80}")
        print(f"LOADING VOTES FOR MEETING: {meeting_id}")
        print(f"{'='*80}\n")

        stats = {
            'scraped': 0,
            'mapped': 0,
            'unmapped': 0,
            'absent_calculated': 0,
            'inserted': 0,
            'failed': 0
        }

        # Step 1: Scrape votes
        print("Step 1: Scraping votes from API...")
        with VotesScraper() as scraper:
            vote_records = scraper.scrape(meeting_id, year, month)
            vote_records = scraper.validate(vote_records)

        stats['scraped'] = len(vote_records)
        print(f"✓ Scraped {stats['scraped']} vote records\n")

        if not vote_records:
            print("No vote records found. Exiting.")
            return stats

        # Step 2: Find or create voting session
        print("Step 2: Finding/creating voting session...")
        session_data = self._extract_session_data(vote_records[0], meeting_id)
        voting_session = self._find_or_create_session(session_data)
        print(f"✓ Voting session ID: {voting_session.id}\n")

        # Step 3: Map person IDs to MEP IDs
        print("Step 3: Mapping person IDs to MEP IDs...")
        mapped_records = []
        unmapped_person_ids = set()

        for record in vote_records:
            person_id = record['person_id']
            mep_id = self._get_mep_id(person_id)

            if mep_id:
                record['mep_id'] = mep_id
                record['session_id'] = voting_session.id
                mapped_records.append(record)
                stats['mapped'] += 1
            else:
                unmapped_person_ids.add(person_id)
                stats['unmapped'] += 1

        print(f"✓ Mapped {stats['mapped']} Polish MEP records")
        if stats['unmapped'] > 0:
            print(f"  Skipped {stats['unmapped']} non-Polish MEPs (not in database - expected)")
        print()

        # Step 4: Calculate ABSENT votes for Polish MEPs
        print("Step 4: Calculating ABSENT votes for Polish MEPs...")
        absent_records = self._calculate_absent_votes(
            mapped_records,
            voting_session.id
        )
        stats['absent_calculated'] = len(absent_records)
        print(f"✓ Calculated {stats['absent_calculated']} ABSENT vote records\n")

        # Combine all records
        all_records = mapped_records + absent_records

        # Step 5: Batch insert into database
        print("Step 5: Batch inserting votes into database...")
        inserted = self._batch_insert_votes(all_records)
        stats['inserted'] = inserted
        print(f"✓ Inserted {stats['inserted']} vote records\n")

        # Step 6: Update session total_votes
        print("Step 6: Updating session statistics...")
        self._update_session_stats(voting_session.id)
        print(f"✓ Updated voting session statistics\n")

        # Print final summary
        print(f"{'='*80}")
        print("LOADING COMPLETE")
        print(f"{'='*80}")
        print(f"Scraped (all MEPs):      {stats['scraped']}")
        print(f"Mapped (Polish MEPs):    {stats['mapped']}")
        print(f"Skipped (non-Polish):    {stats['unmapped']}")
        print(f"Absent calculated:       {stats['absent_calculated']}")
        print(f"Total inserted:          {stats['inserted']}")
        print(f"{'='*80}\n")

        return stats

    def _extract_session_data(
        self,
        sample_record: Dict,
        meeting_id: str
    ) -> Dict:
        """
        Extract voting session data from sample vote record.

        Args:
            sample_record: Sample vote record
            meeting_id: Meeting ID

        Returns:
            Session data dictionary
        """
        # Extract date from meeting_id (MTG-PL-2025-12-15)
        parts = meeting_id.split('-')
        if len(parts) >= 4:
            year = int(parts[2])
            month = int(parts[3])
            day = int(parts[4])
            session_date = date(year, month, day)
        else:
            # Fallback to record date
            session_date = datetime.strptime(
                sample_record['date'], '%Y-%m-%d'
            ).date()

        # Use meeting_id as session_number
        session_number = meeting_id

        return {
            'session_number': session_number,
            'start_date': session_date,
            'end_date': session_date,  # Same day for plenary sessions
            'location': 'Strasbourg',  # Default - could be parsed from meeting data
            'session_type': 'plenary',
            'status': 'completed'
        }

    def _find_or_create_session(self, session_data: Dict) -> VotingSession:
        """
        Find existing voting session or create new one.

        Args:
            session_data: Session data dictionary

        Returns:
            VotingSession object
        """
        # Try to find existing session
        existing = self.session.query(VotingSession).filter(
            VotingSession.session_number == session_data['session_number']
        ).first()

        if existing:
            print(f"  Found existing session: {existing.session_number}")
            return existing

        # Create new session
        try:
            new_session = VotingSession(**session_data)
            self.session.add(new_session)
            self.session.commit()
            print(f"  Created new session: {new_session.session_number}")
            return new_session
        except Exception:
            self.session.rollback()
            # Race condition - try to find again after rollback
            existing = self.session.query(VotingSession).filter(
                VotingSession.session_number == session_data['session_number']
            ).first()
            if existing:
                print(f"  Found existing session (after rollback): {existing.session_number}")
                return existing
            raise

    def _get_mep_id(self, person_id: int) -> Optional[int]:
        """
        Map person_id (EP ID) to mep_id (database ID).

        Args:
            person_id: EP person ID

        Returns:
            Database MEP ID or None if not found
        """
        # Check cache first
        if person_id in self._mep_id_cache:
            return self._mep_id_cache[person_id]

        # Query database
        mep = self.session.query(MEP).filter(MEP.ep_id == person_id).first()

        if mep:
            self._mep_id_cache[person_id] = mep.id
            return mep.id

        return None

    def _get_all_polish_mep_ids(self) -> Set[int]:
        """
        Get all Polish MEP database IDs.

        Returns:
            Set of MEP database IDs
        """
        if self._polish_mep_ids is not None:
            return self._polish_mep_ids

        # Query all Polish MEPs (active ones)
        polish_meps = self.session.query(MEP.id).filter(
            MEP.is_active == True
        ).all()

        self._polish_mep_ids = {mep.id for mep in polish_meps}
        return self._polish_mep_ids

    def _calculate_absent_votes(
        self,
        vote_records: List[Dict],
        session_id: int
    ) -> List[Dict]:
        """
        Calculate ABSENT votes for Polish MEPs who didn't vote.

        Args:
            vote_records: List of mapped vote records
            session_id: Voting session ID

        Returns:
            List of ABSENT vote records
        """
        absent_records = []

        # Get all Polish MEP IDs
        all_polish_meps = self._get_all_polish_mep_ids()

        # Group records by vote_number
        votes_by_number: Dict[str, List[Dict]] = {}
        for record in vote_records:
            vote_num = record['vote_number']
            if vote_num not in votes_by_number:
                votes_by_number[vote_num] = []
            votes_by_number[vote_num].append(record)

        # For each vote, find absent MEPs
        for vote_num, records in votes_by_number.items():
            # Get MEPs who voted
            meps_who_voted = {r['mep_id'] for r in records}

            # Calculate absent MEPs (all Polish MEPs - those who voted)
            absent_meps = all_polish_meps - meps_who_voted

            # Use first record as template for common data
            template = records[0]

            # Create ABSENT record for each absent MEP
            for mep_id in absent_meps:
                absent_record = {
                    'session_id': session_id,
                    'mep_id': mep_id,
                    'vote_number': template['vote_number'],
                    'title': template['title'],
                    'title_en': template.get('title_en'),
                    'date': template['date'],
                    'vote_choice': 'ABSENT',
                    'result': template['result'],
                    'votes_for': template['votes_for'],
                    'votes_against': template['votes_against'],
                    'votes_abstain': template['votes_abstain'],
                }
                absent_records.append(absent_record)

        return absent_records

    def _batch_insert_votes(self, vote_records: List[Dict]) -> int:
        """
        Batch insert vote records into database.

        Args:
            vote_records: List of vote records

        Returns:
            Number of records inserted
        """
        if not vote_records:
            return 0

        # Prepare records for insertion
        insert_data = []
        for record in vote_records:
            vote_data = {
                'session_id': record['session_id'],
                'mep_id': record['mep_id'],
                'vote_number': record['vote_number'],
                'title': record['title'],
                'title_en': record.get('title_en'),
                'date': datetime.strptime(record['date'], '%Y-%m-%d').date(),
                'vote_choice': record['vote_choice'],
                'result': record['result'],
                'votes_for': record.get('votes_for'),
                'votes_against': record.get('votes_against'),
                'votes_abstain': record.get('votes_abstain'),
            }
            insert_data.append(vote_data)

        # Batch insert using SQLAlchemy bulk operations
        try:
            self.session.bulk_insert_mappings(Vote, insert_data)
            self.session.commit()
            return len(insert_data)
        except Exception as e:
            self.session.rollback()
            print(f"Error during batch insert: {e}")
            raise

    def _update_session_stats(self, session_id: int):
        """
        Update voting session statistics.

        Args:
            session_id: Voting session ID
        """
        # Count unique votes in this session
        vote_count = self.session.query(
            func.count(func.distinct(Vote.vote_number))
        ).filter(
            Vote.session_id == session_id
        ).scalar()

        # Update session
        session = self.session.query(VotingSession).filter(
            VotingSession.id == session_id
        ).first()

        if session:
            session.total_votes = vote_count
            self.session.commit()

    def close(self):
        """Close database session."""
        self.session.close()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Load votes from EP API into database'
    )
    parser.add_argument(
        'meeting_id',
        help='Meeting ID (e.g., MTG-PL-2025-12-15)'
    )
    parser.add_argument(
        '--year',
        type=int,
        help='Year (optional, extracted from meeting_id)'
    )
    parser.add_argument(
        '--month',
        type=int,
        help='Month (optional, extracted from meeting_id)'
    )

    args = parser.parse_args()

    # Load environment variables
    load_dotenv()
    db_url = os.getenv('DATABASE_URL')

    if not db_url:
        print("Error: DATABASE_URL not set in environment")
        sys.exit(1)

    # Create loader and load votes
    loader = VotesLoader(db_url)

    try:
        stats = loader.load_votes_for_meeting(
            args.meeting_id,
            args.year,
            args.month
        )

        # Exit with error if nothing was inserted
        if stats['inserted'] == 0:
            sys.exit(1)

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        loader.close()


if __name__ == "__main__":
    main()
