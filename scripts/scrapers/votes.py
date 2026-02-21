"""Scraper for European Parliament voting results."""
import re
from typing import List, Dict, Any, Optional, Tuple, Set
from datetime import datetime
from .base import BaseScraper


class VotesScraper(BaseScraper):
    """
    Scraper for voting results using EP Open Data API v2.

    This scraper collects:
    - Vote metadata (title, date, result, document references)
    - Individual MEP votes (FOR, AGAINST, ABSTAIN, ABSENT)
    - Vote breakdowns (total counts)

    Data flow:
    1. Fetch decisions from /api/v2/meetings/{MEETING_ID}/decisions
    2. Parse each decision (vote)
    3. Extract person IDs for each vote choice
    4. Map person IDs to MEP database IDs
    5. Create vote records (one per MEP per vote)
    """

    # European Parliament Open Data API
    API_BASE_URL = "https://data.europarl.europa.eu/api/v2"

    def __init__(self):
        """Initialize votes scraper."""
        super().__init__(
            base_url=self.API_BASE_URL,
            rate_limit_seconds=2.0  # Conservative rate limiting
        )

    def scrape(
        self,
        meeting_id: str,
        year: Optional[int] = None,
        month: Optional[int] = None,
        calculate_absent: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Scrape voting results for a specific meeting.

        Args:
            meeting_id: Meeting identifier (e.g., "MTG-PL-2024-12-15")
            year: Year (optional, for logging)
            month: Month (optional, for logging)
            calculate_absent: Whether to calculate ABSENT votes (default: True)

        Returns:
            List of vote record dictionaries (one per MEP per vote)

        Note:
            A single vote has ~700 MEP vote records (one for each MEP).
            A session typically has 100-200 votes.
            So one session = ~70,000-140,000 records.
        """
        self.log_info(f"Starting votes scraping for meeting {meeting_id}...")

        try:
            # Fetch all decisions for this meeting
            all_vote_records = []
            offset = 0
            limit = 100  # Fetch in batches
            total_decisions = 0

            while True:
                decisions_data = self._fetch_decisions(meeting_id, offset, limit)

                if not decisions_data:
                    break

                # Extract decisions list from response
                decisions = self._extract_decisions_list(decisions_data)

                if not decisions:
                    break

                self.log_info(
                    f"Processing batch: {len(decisions)} decisions "
                    f"(offset {offset})"
                )

                # Process each decision
                for decision in decisions:
                    vote_records = self._parse_decision(
                        decision,
                        meeting_id,
                        calculate_absent
                    )
                    all_vote_records.extend(vote_records)
                    total_decisions += 1

                # Check if we need to fetch more
                if len(decisions) < limit:
                    break  # Last batch

                offset += limit

            self.log_info(
                f"✓ Scraped {len(all_vote_records)} vote records from "
                f"{total_decisions} decisions in meeting {meeting_id}"
            )

            return all_vote_records

        except Exception as e:
            self.log_error(f"Scraping failed: {e}", exc_info=True)
            raise

    def _fetch_decisions(
        self,
        meeting_id: str,
        offset: int = 0,
        limit: int = 100
    ) -> Optional[Dict]:
        """
        Fetch decisions (votes) from a meeting.

        Args:
            meeting_id: Meeting ID (e.g., 'MTG-PL-2025-12-15')
            offset: Pagination offset
            limit: Number of decisions to fetch

        Returns:
            JSON response or None if failed
        """
        url = f"{self.base_url}/meetings/{meeting_id}/decisions"
        params = {
            'format': 'application/ld+json',
            'json-layout': 'framed',
            'offset': offset,
            'limit': limit
        }

        try:
            response = self.http.get(url, params=params, timeout=30)

            if response.status_code == 404:
                self.log_warning(f"Meeting {meeting_id} not found (404)")
                return None

            response.raise_for_status()

            data = response.json()
            return data

        except Exception as e:
            self.log_error(f"Failed to fetch decisions: {e}")
            return None

    def _extract_decisions_list(self, data: Dict) -> List[Dict]:
        """
        Extract decisions list from JSON-LD response.

        Args:
            data: JSON response

        Returns:
            List of decision objects
        """
        # Handle different response structures
        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            if 'data' in data:
                return data['data'] if isinstance(data['data'], list) else [data['data']]
            elif '@graph' in data:
                return data['@graph']
            else:
                return [data]
        return []

    def _parse_decision(
        self,
        decision: Dict,
        meeting_id: str,
        calculate_absent: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Parse a single decision (vote) and create vote records.

        Args:
            decision: Decision JSON object
            meeting_id: Meeting identifier
            calculate_absent: Whether to calculate ABSENT votes

        Returns:
            List of vote records (one per MEP who voted)
        """
        try:
            # Extract vote metadata
            vote_id = decision.get('notation_votingId', 'N/A')

            # Extract titles
            activity_label = decision.get('activity_label', {})
            title_pl = activity_label.get('pl', '')
            title_en = activity_label.get('en', '')

            # Use English title if Polish is missing
            if not title_pl and title_en:
                title_pl = title_en

            # Extract date
            date_str = decision.get('activity_date', '')

            # Extract outcome
            outcome_uri = decision.get('decision_outcome', '')
            outcome = self._normalize_result(outcome_uri.split('/')[-1] if outcome_uri else '')

            # Extract vote totals
            votes_for = decision.get('number_of_votes_favor', 0)
            votes_against = decision.get('number_of_votes_against', 0)
            votes_abstain = decision.get('number_of_votes_abstention', 0)
            attendees = decision.get('number_of_attendees', 0)

            # Extract decision method
            decision_method = decision.get('decision_method', '')
            is_rollcall = 'ROLLCALL' in decision_method.upper()

            # Only ROLLCALL votes have individual MEP votes
            if not is_rollcall:
                self.log_info(
                    f"Skipping vote {vote_id} - not a roll-call vote "
                    f"(method: {decision_method})"
                )
                return []

            # Extract voter lists
            voters_for = decision.get('had_voter_favor', [])
            voters_against = decision.get('had_voter_against', [])
            voters_abstain = decision.get('had_voter_abstention', [])

            # Extract person IDs
            person_ids_for = [self._extract_person_id(v) for v in voters_for]
            person_ids_against = [self._extract_person_id(v) for v in voters_against]
            person_ids_abstain = [self._extract_person_id(v) for v in voters_abstain]

            # Create vote records
            vote_records = []

            # Common metadata for all records
            common_data = {
                'vote_number': str(vote_id),
                'title': title_pl[:500] if title_pl else 'N/A',  # Limit length
                'title_en': title_en[:500] if title_en else None,
                'date': date_str,
                'result': outcome,
                'votes_for': votes_for,
                'votes_against': votes_against,
                'votes_abstain': votes_abstain,
                'meeting_id': meeting_id
            }

            # FOR votes
            for person_id in person_ids_for:
                vote_records.append({
                    **common_data,
                    'person_id': person_id,
                    'vote_choice': 'FOR'
                })

            # AGAINST votes
            for person_id in person_ids_against:
                vote_records.append({
                    **common_data,
                    'person_id': person_id,
                    'vote_choice': 'AGAINST'
                })

            # ABSTAIN votes
            for person_id in person_ids_abstain:
                vote_records.append({
                    **common_data,
                    'person_id': person_id,
                    'vote_choice': 'ABSTAIN'
                })

            # Calculate ABSENT if requested
            # Note: This would require knowing all MEP IDs
            # For now, we only record explicit votes
            # ABSENT calculation should be done in data loading phase

            self.stats['items_scraped'] += len(vote_records)

            return vote_records

        except Exception as e:
            self.log_warning(f"Failed to parse decision: {e}")
            return []

    def _extract_person_id(self, person_uri: str) -> int:
        """
        Extract numeric person ID from URI.

        Args:
            person_uri: Person URI (e.g., 'person/197498')

        Returns:
            Numeric person ID (ep_id)
        """
        try:
            return int(person_uri.split('/')[-1])
        except (ValueError, IndexError, AttributeError):
            return 0

    def _normalize_result(self, result: str) -> str:
        """
        Normalize vote result to consistent values.

        Args:
            result: Raw result from API

        Returns:
            Normalized result: ADOPTED or REJECTED
        """
        if not result:
            return 'UNKNOWN'

        result = str(result).strip().upper()

        if 'ADOPT' in result or 'PASS' in result or 'ACCEPT' in result:
            return 'ADOPTED'
        elif 'REJECT' in result or 'FAIL' in result or 'DEFEAT' in result:
            return 'REJECTED'
        else:
            return 'UNKNOWN'

    def validate(self, data: List[Dict]) -> List[Dict]:
        """
        Validate vote records.

        Args:
            data: List of scraped vote records

        Returns:
            List of valid vote records
        """
        valid_votes = []

        for vote in data:
            # Required fields
            required = ['vote_number', 'vote_choice', 'person_id']
            if not all(vote.get(field) for field in required):
                self.log_warning(
                    f"Missing required fields in vote: {vote.get('vote_number')}"
                )
                self.stats['items_invalid'] += 1
                continue

            # Validate person_id
            if not vote.get('person_id') or vote['person_id'] == 0:
                self.log_warning(
                    f"Invalid person_id in vote: {vote.get('vote_number')}"
                )
                self.stats['items_invalid'] += 1
                continue

            # Validate vote choice
            if vote['vote_choice'] not in ['FOR', 'AGAINST', 'ABSTAIN', 'ABSENT']:
                self.log_warning(f"Invalid vote choice: {vote['vote_choice']}")
                self.stats['items_invalid'] += 1
                continue

            # Validate result if present
            if vote.get('result'):
                if vote['result'] not in ['ADOPTED', 'REJECTED', 'UNKNOWN']:
                    self.log_warning(f"Invalid result: {vote['result']}")
                    vote['result'] = 'UNKNOWN'

            # Validate date format if present
            if vote.get('date'):
                try:
                    datetime.strptime(vote['date'], '%Y-%m-%d')
                except ValueError:
                    self.log_warning(f"Invalid date format: {vote['date']}")
                    vote['date'] = None

            valid_votes.append(vote)
            self.stats['items_valid'] += 1

        self.log_info(f"Validated {len(valid_votes)}/{len(data)} vote records")
        return valid_votes


# Example usage
if __name__ == "__main__":
    import os
    from dotenv import load_dotenv

    load_dotenv()

    with VotesScraper() as scraper:
        # Scrape votes for a meeting
        meeting_id = "MTG-PL-2025-12-15"
        votes = scraper.scrape(meeting_id=meeting_id)

        # Validate
        valid_votes = scraper.validate(votes)

        # Print summary
        scraper.print_summary()

        # Show sample
        if valid_votes:
            print(f"\nTotal vote records: {len(valid_votes)}")
            print("\nSample vote record:")
            print(valid_votes[0])

            # Group by vote number to see unique votes
            unique_votes = {}
            for vote in valid_votes:
                vote_num = vote['vote_number']
                if vote_num not in unique_votes:
                    unique_votes[vote_num] = {
                        'title': vote['title'],
                        'result': vote['result'],
                        'choices': {'FOR': 0, 'AGAINST': 0, 'ABSTAIN': 0}
                    }
                choice = vote['vote_choice']
                unique_votes[vote_num]['choices'][choice] += 1

            print(f"\nUnique votes found: {len(unique_votes)}")
            for vote_num, info in list(unique_votes.items())[:5]:
                print(f"\n{vote_num}: {info['title'][:80]}...")
                print(f"Result: {info['result']}")
                print(f"Votes: FOR={info['choices']['FOR']}, "
                      f"AGAINST={info['choices']['AGAINST']}, "
                      f"ABSTAIN={info['choices']['ABSTAIN']}")
