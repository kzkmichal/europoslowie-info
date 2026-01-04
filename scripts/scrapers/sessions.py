"""Scraper for European Parliament plenary sessions."""
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from .base import BaseScraper


class VotingSessionsScraper(BaseScraper):
    """Scraper for plenary session metadata."""

    # European Parliament plenary portal
    API_BASE_URL = "https://data.europarl.europa.eu/api/v2"
    WEB_BASE_URL = "https://www.europarl.europa.eu/plenary/en"

    def __init__(self):
        """Initialize sessions scraper."""
        super().__init__(
            base_url=self.API_BASE_URL,
            rate_limit_seconds=2.0
        )

    def scrape(
        self,
        year: Optional[int] = None,
        month: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Scrape plenary sessions for a given period.

        Args:
            year: Year to scrape (default: current year)
            month: Month to scrape (default: current month)

        Returns:
            List of session dictionaries
        """
        # Default to current month if not specified
        if year is None or month is None:
            now = datetime.now()
            year = year or now.year
            month = month or now.month

        self.log_info(f"Starting sessions scraping for {year}-{month:02d}...")

        # Try API first
        try:
            sessions = self._scrape_from_api(year, month)
            if sessions:
                self.log_info(f"✓ Scraped {len(sessions)} sessions from API")
                return sessions
        except Exception as e:
            self.log_error(f"API scraping failed: {e}", exc_info=True)
            self.log_warning("Falling back to web scraping...")

        # Fallback to web scraping
        try:
            sessions = self._scrape_from_web(year, month)
            if sessions:
                self.log_info(f"✓ Scraped {len(sessions)} sessions from website")
                return sessions
        except Exception as e:
            self.log_error(f"Web scraping failed: {e}", exc_info=True)
            raise RuntimeError("All scraping methods failed")

        return []

    def _scrape_from_api(
        self,
        year: int,
        month: int
    ) -> List[Dict[str, Any]]:
        """
        Scrape sessions from EP Open Data API.

        Args:
            year: Year
            month: Month

        Returns:
            List of session dictionaries
        """
        self.log_info("Attempting to scrape from EP Open Data API...")

        # Calculate date range for the month
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = datetime(year, month + 1, 1) - timedelta(days=1)

        # Example endpoint (may need adjustment based on actual API)
        url = f"{self.base_url}/plenary-sessions"
        params = {
            'date-from': start_date.strftime('%Y-%m-%d'),
            'date-to': end_date.strftime('%Y-%m-%d'),
            'format': 'application/json'
        }

        try:
            response = self.http.get(url, params=params)
            data = response.json()

            sessions = []
            items = data.get('data', []) if isinstance(data, dict) else data

            for item in items:
                session = self._parse_api_session(item)
                if session:
                    sessions.append(session)
                    self.stats['items_scraped'] += 1

            return sessions

        except Exception as e:
            self.log_error(f"API parsing error: {e}")
            return []

    def _parse_api_session(self, item: Dict) -> Optional[Dict[str, Any]]:
        """
        Parse session data from API response.

        Args:
            item: Raw API data item

        Returns:
            Parsed session dictionary or None if invalid
        """
        try:
            # Extract identifier (e.g., "2024-11-I" for first session in Nov 2024)
            session_number = self._extract_str(
                item,
                ['identifier', 'sessionNumber', 'reference']
            )

            # Parse start and end dates
            start_date = self._extract_date(
                item,
                ['dateStart', 'startDate', 'from']
            )
            end_date = self._extract_date(
                item,
                ['dateEnd', 'endDate', 'to']
            )

            # Session type (PLENARY, MINI_PLENARY, etc.)
            session_type = self._extract_str(
                item,
                ['sessionType', 'type']
            ) or 'PLENARY'

            # Location (usually Strasbourg or Brussels)
            location = self._extract_str(
                item,
                ['location', 'place']
            )

            session = {
                'session_number': session_number,
                'start_date': start_date,
                'end_date': end_date,
                'session_type': session_type.upper(),
                'location': location,
                'year': int(start_date[:4]) if start_date else None,
                'month': int(start_date[5:7]) if start_date else None,
            }

            return session

        except Exception as e:
            self.log_warning(f"Failed to parse session: {e}")
            return None

    def _scrape_from_web(
        self,
        year: int,
        month: int
    ) -> List[Dict[str, Any]]:
        """
        Scrape sessions from official website (fallback).

        Args:
            year: Year
            month: Month

        Returns:
            List of session dictionaries

        Note:
            This is a placeholder. Real implementation would use BeautifulSoup
            to parse the plenary calendar HTML.
        """
        self.log_warning("Web scraping not fully implemented yet")
        self.log_info("Using mock session data for testing...")

        # Mock data for current month (for testing)
        # In production, this would scrape from the actual website
        now = datetime.now()
        if year == now.year and month == now.month:
            return self._get_mock_sessions(year, month)

        return []

    def _get_mock_sessions(
        self,
        year: int,
        month: int
    ) -> List[Dict[str, Any]]:
        """
        Generate mock session data for testing.

        Args:
            year: Year
            month: Month

        Returns:
            List of mock session dictionaries
        """
        # Typical session: mid-month, 4 days (Mon-Thu)
        # Using 12-15 as typical plenary week
        start_day = 12
        session_number = f"{year}-{month:02d}-I"

        session = {
            'session_number': session_number,
            'start_date': f"{year}-{month:02d}-{start_day:02d}",
            'end_date': f"{year}-{month:02d}-{start_day + 3:02d}",
            'session_type': 'PLENARY',
            'location': 'Strasbourg',
            'year': year,
            'month': month,
        }

        self.stats['items_scraped'] += 1
        return [session]

    def validate(self, data: List[Dict]) -> List[Dict]:
        """
        Validate session data.

        Args:
            data: List of scraped session dictionaries

        Returns:
            List of valid session dictionaries
        """
        valid_sessions = []

        for session in data:
            # Required fields
            if not session.get('session_number'):
                self.log_warning(
                    f"Missing session_number: {session.get('start_date')}"
                )
                self.stats['items_invalid'] += 1
                continue

            if not session.get('start_date'):
                self.log_warning(
                    f"Missing start_date for session: {session.get('session_number')}"
                )
                self.stats['items_invalid'] += 1
                continue

            # Validate date formats
            try:
                datetime.strptime(session['start_date'], '%Y-%m-%d')
                if session.get('end_date'):
                    datetime.strptime(session['end_date'], '%Y-%m-%d')
            except ValueError as e:
                self.log_warning(f"Invalid date format: {e}")
                self.stats['items_invalid'] += 1
                continue

            # Validate session type
            valid_types = ['PLENARY', 'MINI_PLENARY', 'EXTRAORDINARY']
            if session.get('session_type'):
                if session['session_type'] not in valid_types:
                    self.log_warning(
                        f"Unknown session type: {session['session_type']}, "
                        f"defaulting to PLENARY"
                    )
                    session['session_type'] = 'PLENARY'

            # Validate session number format (YYYY-MM-X pattern)
            if not re.match(r'^\d{4}-\d{2}-[IVX]+$', session['session_number']):
                self.log_warning(
                    f"Non-standard session_number format: {session['session_number']}"
                )
                # Don't reject, just log warning

            valid_sessions.append(session)
            self.stats['items_valid'] += 1

        self.log_info(f"Validated {len(valid_sessions)}/{len(data)} sessions")
        return valid_sessions

    # Helper methods (similar to MEPs scraper)

    def _extract_str(self, data: Dict, keys: List[str]) -> Optional[str]:
        """Try to extract string from multiple possible keys."""
        for key in keys:
            if key in data and data[key]:
                return str(data[key]).strip()
        return None

    def _extract_date(self, data: Dict, keys: List[str]) -> Optional[str]:
        """Try to extract and normalize date from multiple possible keys."""
        for key in keys:
            if key in data and data[key]:
                date_str = str(data[key])
                # Try to parse and normalize to YYYY-MM-DD
                try:
                    # Handle various date formats
                    for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%Y-%m-%dT%H:%M:%S']:
                        try:
                            dt = datetime.strptime(
                                date_str.split('T')[0],
                                fmt.split('T')[0]
                            )
                            return dt.strftime('%Y-%m-%d')
                        except ValueError:
                            continue
                    # If no format matches, return as-is
                    return date_str.split('T')[0]  # Remove time part if present
                except Exception:
                    continue
        return None


# Example usage
if __name__ == "__main__":
    import os
    from dotenv import load_dotenv

    load_dotenv()

    with VotingSessionsScraper() as scraper:
        # Scrape current month's sessions
        sessions = scraper.scrape()

        # Validate
        valid_sessions = scraper.validate(sessions)

        # Print summary
        scraper.print_summary()

        # Show sessions
        if valid_sessions:
            print("\nSessions found:")
            for session in valid_sessions:
                print(f"  {session['session_number']}: "
                      f"{session['start_date']} to {session['end_date']} "
                      f"({session['location']})")
