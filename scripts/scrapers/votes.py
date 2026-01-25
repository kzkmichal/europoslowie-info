"""Scraper for European Parliament voting results."""
import re
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from .base import BaseScraper


class VotesScraper(BaseScraper):
    """
    Scraper for voting results - largest and most complex dataset.

    This scraper collects:
    - Vote metadata (title, date, result, document references)
    - Individual MEP votes (FOR, AGAINST, ABSTAIN, ABSENT)
    - Vote breakdowns (total counts)
    """

    # European Parliament voting results
    API_BASE_URL = "https://www.europarl.europa.eu/plenary/en"
    WEB_BASE_URL = "https://www.europarl.europa.eu/plenary/en"

    def __init__(self):
        """Initialize votes scraper."""
        super().__init__(
            base_url=self.WEB_BASE_URL,
            rate_limit_seconds=3.0  # More conservative for larger dataset
        )

    def scrape(
        self,
        session_number: str,
        year: Optional[int] = None,
        month: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Scrape voting results for a specific session.

        Args:
            session_number: Session identifier (e.g., "2024-11-I")
            year: Year (extracted from session_number if not provided)
            month: Month (extracted from session_number if not provided)

        Returns:
            List of vote record dictionaries (one per MEP per vote)

        Note:
            A single vote has ~700 MEP vote records (one for each MEP).
            A session typically has 150-200 votes.
            So one session = ~100,000+ records.
        """
        self.log_info(f"Starting votes scraping for session {session_number}...")

        # Extract year/month from session_number if not provided
        if year is None or month is None:
            year, month = self._parse_session_number(session_number)

        # Try to get voting results
        try:
            votes = self._scrape_session_votes(session_number, year, month)
            if votes:
                self.log_info(
                    f"✓ Scraped {len(votes)} vote records from session {session_number}"
                )
                return votes
        except Exception as e:
            self.log_error(f"Scraping failed: {e}", exc_info=True)
            raise

        return []

    def _parse_session_number(self, session_number: str) -> Tuple[int, int]:
        """
        Extract year and month from session number.

        Args:
            session_number: Session identifier (e.g., "2024-11-I")

        Returns:
            Tuple of (year, month)
        """
        match = re.match(r'^(\d{4})-(\d{2})-', session_number)
        if match:
            return int(match.group(1)), int(match.group(2))
        raise ValueError(f"Invalid session_number format: {session_number}")

    def _scrape_session_votes(
        self,
        session_number: str,
        year: int,
        month: int
    ) -> List[Dict[str, Any]]:
        """
        Scrape all votes from a single session.

        Args:
            session_number: Session identifier
            year: Year
            month: Month

        Returns:
            List of vote records
        """
        self.log_info(f"Fetching votes for session {session_number}")

        # Step 1: Try to get voting results XML
        # EP publishes voting results as XML files
        xml_content = self._fetch_voting_results_xml(session_number, year, month)

        if not xml_content:
            self.log_warning("No voting results XML found, using mock data")
            return self._get_mock_votes(session_number)

        # Step 2: Parse XML
        all_vote_records = self._parse_voting_results_xml(
            xml_content,
            session_number
        )

        return all_vote_records

    def _fetch_voting_results_xml(
        self,
        session_number: str,
        year: int,
        month: int
    ) -> Optional[str]:
        """
        Fetch voting results XML file from EP website.

        Args:
            session_number: Session identifier
            year: Year
            month: Month

        Returns:
            XML content as string, or None if not found

        Note:
            EP publishes voting results in various URL patterns.
            Common patterns:
            - /doceo/document/PV-{term}-{session}-RCV_FR.xml
            - /sides/getDoc.do?type=PV&reference={date}&format=XML
        """
        self.log_info("Attempting to fetch voting results XML...")

        # Try different URL patterns
        url_patterns = [
            # Pattern 1: Direct XML file (most common)
            f"{self.base_url}/doceo/document/PV-10-{year}-{month:02d}-RCV_FR.xml",

            # Pattern 2: getDoc API
            f"{self.base_url}/sides/getDoc.do?type=PV&reference={year}{month:02d}&format=XML",

            # Pattern 3: Session-specific
            f"{self.base_url}/votes?term=10&session={session_number}",
        ]

        for url in url_patterns:
            try:
                self.log_info(f"Trying URL: {url}")
                response = self.http.get(url, timeout=30)

                if response.status_code == 200:
                    content_type = response.headers.get('content-type', '')

                    # Check if response is XML
                    if 'xml' in content_type.lower() or url.endswith('.xml'):
                        self.log_info("✓ Found XML voting results")
                        return response.text

                    # If HTML, might contain download link
                    if 'html' in content_type.lower():
                        # TODO: Parse HTML to find XML download link
                        self.log_warning("Got HTML instead of XML, need to parse")

            except Exception as e:
                self.log_warning(f"Failed to fetch {url}: {e}")
                continue

        self.log_warning("Could not fetch voting results XML from any source")
        return None

    def _parse_voting_results_xml(
        self,
        xml_content: str,
        session_number: str
    ) -> List[Dict[str, Any]]:
        """
        Parse voting results XML file.

        Args:
            xml_content: XML content as string
            session_number: Session identifier

        Returns:
            List of vote records (one per MEP per vote)

        Note:
            EP voting XML structure (simplified):
            <RollCallVotes>
              <RollCallVote.Result>
                <Identifier>Vote 1</Identifier>
                <Title>Amendment 123...</Title>
                <Result>Adopted</Result>
                <TotalVotes For="420" Against="180" Abstentions="50"/>
                <Result.Description>
                  <Result.Description.Text Language="EN">
                    <Member.Name>John SMITH</Member.Name>
                    <Vote>+</Vote>  <!-- +/-/0/abs -->
                  </Result.Description.Text>
                </Result.Description>
              </RollCallVote.Result>
            </RollCallVotes>

            Actual structure may vary!
        """
        self.log_info("Parsing voting results XML...")

        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as e:
            self.log_error(f"Failed to parse XML: {e}")
            return []

        all_vote_records = []

        # Find all individual votes
        # XML structure varies, try common patterns
        vote_elements = (
            root.findall('.//RollCallVote.Result') or
            root.findall('.//Vote') or
            root.findall('.//*[@Identifier]')
        )

        self.log_info(f"Found {len(vote_elements)} votes in XML")

        for vote_elem in vote_elements:
            # Parse common vote information
            vote_common = self._parse_vote_metadata(vote_elem, session_number)

            if not vote_common:
                continue

            # Parse individual MEP votes for this vote
            mep_votes = self._parse_mep_votes(vote_elem)

            # Create one record per MEP
            for mep_vote in mep_votes:
                vote_record = {
                    **vote_common,  # Common vote info
                    **mep_vote  # MEP-specific info
                }
                all_vote_records.append(vote_record)
                self.stats['items_scraped'] += 1

        self.log_info(
            f"Parsed {len(all_vote_records)} individual vote records "
            f"from {len(vote_elements)} votes"
        )

        return all_vote_records

    def _parse_vote_metadata(
        self,
        vote_elem: ET.Element,
        session_number: str
    ) -> Optional[Dict[str, Any]]:
        """
        Parse common vote information from XML element.

        Args:
            vote_elem: XML element for a single vote
            session_number: Session identifier

        Returns:
            Dictionary with common vote info, or None if invalid
        """
        try:
            # Vote identifier/number
            vote_number = (
                vote_elem.get('Identifier') or
                vote_elem.findtext('Identifier') or
                vote_elem.findtext('VoteNumber')
            )

            if not vote_number:
                return None

            # Vote title/subject
            title = (
                vote_elem.findtext('Title') or
                vote_elem.findtext('Subject') or
                vote_elem.findtext('.//Title[@Language="EN"]') or
                "No title available"
            )

            # Vote date
            date_str = (
                vote_elem.findtext('Date') or
                vote_elem.findtext('VoteDate') or
                vote_elem.get('Date')
            )

            # Result (ADOPTED/REJECTED)
            result = vote_elem.findtext('Result') or ''
            result = self._normalize_result(result)

            # Vote breakdown (total counts)
            totals = self._parse_vote_totals(vote_elem)

            # Document reference
            doc_ref = (
                vote_elem.findtext('Reference') or
                vote_elem.findtext('DocumentReference') or
                vote_elem.get('Reference')
            )

            return {
                'session_number': session_number,
                'vote_number': str(vote_number).strip(),
                'title': title.strip()[:500],  # Limit length
                'date': self._normalize_date(date_str) if date_str else None,
                'result': result,
                'total_for': totals.get('for', 0),
                'total_against': totals.get('against', 0),
                'total_abstain': totals.get('abstain', 0),
                'document_reference': doc_ref
            }

        except Exception as e:
            self.log_warning(f"Failed to parse vote metadata: {e}")
            return None

    def _parse_vote_totals(self, vote_elem: ET.Element) -> Dict[str, int]:
        """
        Parse total vote counts from XML element.

        Args:
            vote_elem: XML element

        Returns:
            Dictionary with 'for', 'against', 'abstain' counts
        """
        totals = {'for': 0, 'against': 0, 'abstain': 0}

        # Try to find TotalVotes element
        total_elem = vote_elem.find('.//TotalVotes')
        if total_elem is not None:
            totals['for'] = int(total_elem.get('For', 0))
            totals['against'] = int(total_elem.get('Against', 0))
            totals['abstain'] = int(total_elem.get('Abstentions', 0))
        else:
            # Try alternative structure
            for_elem = vote_elem.findtext('.//For')
            against_elem = vote_elem.findtext('.//Against')
            abstain_elem = vote_elem.findtext('.//Abstentions')

            if for_elem:
                totals['for'] = int(for_elem)
            if against_elem:
                totals['against'] = int(against_elem)
            if abstain_elem:
                totals['abstain'] = int(abstain_elem)

        return totals

    def _parse_mep_votes(self, vote_elem: ET.Element) -> List[Dict[str, Any]]:
        """
        Parse how each MEP voted from XML element.

        Args:
            vote_elem: XML element for a single vote

        Returns:
            List of MEP vote dictionaries
        """
        mep_votes = []

        # Try different XML structures for MEP votes
        # Structure varies between different XML formats

        # Pattern 1: Result.Description with Member.Name
        for member_elem in vote_elem.findall('.//Member.Name'):
            mep_name = member_elem.text
            vote_choice = member_elem.get('Vote') or '?'

            mep_votes.append({
                'mep_name': mep_name.strip() if mep_name else None,
                'vote_choice': self._normalize_vote_choice(vote_choice)
            })

        # Pattern 2: Individual Vote elements
        if not mep_votes:
            for mep_elem in vote_elem.findall('.//PoliticalGroup.Member'):
                mep_id = mep_elem.get('MepId')
                mep_name = mep_elem.get('Name')
                vote_choice = mep_elem.get('Vote') or mep_elem.get('Choice')

                mep_votes.append({
                    'mep_ep_id': int(mep_id) if mep_id else None,
                    'mep_name': mep_name.strip() if mep_name else None,
                    'vote_choice': self._normalize_vote_choice(vote_choice)
                })

        # Pattern 3: Grouped by vote choice
        if not mep_votes:
            for choice in ['For', 'Against', 'Abstain', 'Absent']:
                choice_elem = vote_elem.find(f'.//{choice}')
                if choice_elem is not None:
                    members_text = choice_elem.text or ''
                    # Split by comma or newline
                    members = re.split(r'[,\n]', members_text)
                    for member in members:
                        member = member.strip()
                        if member:
                            mep_votes.append({
                                'mep_name': member,
                                'vote_choice': self._normalize_vote_choice(choice)
                            })

        return mep_votes

    def _normalize_vote_choice(self, choice: str) -> str:
        """
        Normalize vote choice to consistent values.

        Args:
            choice: Raw vote choice from XML

        Returns:
            Normalized choice: FOR, AGAINST, ABSTAIN, or ABSENT
        """
        if not choice:
            return 'ABSENT'

        choice = str(choice).strip().upper()

        # Mapping of various formats to standard values
        mapping = {
            'FOR': 'FOR',
            '+': 'FOR',
            'YES': 'FOR',
            'Y': 'FOR',
            'AGAINST': 'AGAINST',
            '-': 'AGAINST',
            'NO': 'AGAINST',
            'N': 'AGAINST',
            'ABSTAIN': 'ABSTAIN',
            'ABSTENTION': 'ABSTAIN',
            'ABSTENTIONS': 'ABSTAIN',
            '0': 'ABSTAIN',
            'A': 'ABSTAIN',
            'ABSENT': 'ABSENT',
            'ABS': 'ABSENT',
            'DID NOT VOTE': 'ABSENT',
            '': 'ABSENT',
        }

        return mapping.get(choice, 'ABSENT')

    def _normalize_result(self, result: str) -> str:
        """
        Normalize vote result to consistent values.

        Args:
            result: Raw result from XML

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

    def _normalize_date(self, date_str: str) -> Optional[str]:
        """
        Normalize date to YYYY-MM-DD format.

        Args:
            date_str: Date string in various formats

        Returns:
            Date in YYYY-MM-DD format, or None
        """
        if not date_str:
            return None

        try:
            # Try various date formats
            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d.%m.%Y', '%Y%m%d']:
                try:
                    dt = datetime.strptime(date_str.split('T')[0], fmt)
                    return dt.strftime('%Y-%m-%d')
                except ValueError:
                    continue
            # If no format matches, return as-is
            return date_str.split('T')[0]
        except Exception:
            return None

    def _get_mock_votes(self, session_number: str) -> List[Dict[str, Any]]:
        """
        Generate mock vote data for testing.

        Args:
            session_number: Session identifier

        Returns:
            List of mock vote records
        """
        self.log_warning("Using mock vote data for testing")

        # Create a few mock votes
        mock_votes = []

        # Sample Polish MEP names for testing
        polish_meps = [
            "Jan KOWALSKI", "Anna NOWAK", "Piotr WIŚNIEWSKI",
            "Maria KOWALCZYK", "Andrzej KAMIŃSKI"
        ]

        vote_choices = ['FOR', 'AGAINST', 'ABSTAIN', 'FOR', 'FOR']

        for vote_num in range(1, 3):  # Just 2 votes for testing
            for i, mep_name in enumerate(polish_meps):
                vote_record = {
                    'session_number': session_number,
                    'vote_number': f"Vote {vote_num}",
                    'title': f"Mock vote {vote_num} - Test amendment",
                    'date': '2024-11-12',
                    'result': 'ADOPTED' if vote_num == 1 else 'REJECTED',
                    'total_for': 420,
                    'total_against': 180,
                    'total_abstain': 50,
                    'document_reference': f"A10-{vote_num}/2024",
                    'mep_name': mep_name,
                    'vote_choice': vote_choices[i]
                }
                mock_votes.append(vote_record)
                self.stats['items_scraped'] += 1

        return mock_votes

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
            required = ['session_number', 'vote_number', 'vote_choice']
            if not all(vote.get(field) for field in required):
                self.log_warning(
                    f"Missing required fields in vote: {vote.get('vote_number')}"
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

            # At least one of mep_ep_id or mep_name should be present
            if not vote.get('mep_ep_id') and not vote.get('mep_name'):
                self.log_warning(
                    f"Vote record has neither mep_ep_id nor mep_name: "
                    f"{vote.get('vote_number')}"
                )
                self.stats['items_invalid'] += 1
                continue

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
        # Scrape votes for a session
        session_number = "2024-11-I"
        votes = scraper.scrape(session_number=session_number)

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
                        'meps': []
                    }
                unique_votes[vote_num]['meps'].append(
                    f"{vote.get('mep_name', 'Unknown')}: {vote['vote_choice']}"
                )

            print(f"\nUnique votes found: {len(unique_votes)}")
            for vote_num, info in list(unique_votes.items())[:2]:
                print(f"\n{vote_num}: {info['title']}")
                print(f"Result: {info['result']}")
                print(f"MEPs voted: {len(info['meps'])}")
