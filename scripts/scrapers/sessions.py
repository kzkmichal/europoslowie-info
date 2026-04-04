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

        Strategy:
        - For recent data (>=2020): Generate meeting IDs by date and fetch individually
        - For historical data (<2020): Use bulk /meetings endpoint
        - Group consecutive days into sessions (e.g., Mon-Thu = one session)

        Args:
            year: Year
            month: Month

        Returns:
            List of session dictionaries
        """
        self.log_info("Attempting to scrape from EP Open Data API...")

        # Choose strategy based on year
        if year >= 2020:
            # Recent data: fetch by generated IDs (works for 2020-present)
            meeting_days = self._scrape_recent_meetings(year, month)
        else:
            # Historical data: use bulk endpoint (works for 2014-2019)
            meeting_days = self._scrape_historical_meetings(year, month)

        if not meeting_days:
            self.log_warning(f"No plenary meetings found for {year}-{month:02d}")
            return []

        # Group consecutive meeting days into sessions
        sessions = self._group_days_into_sessions(meeting_days, year, month)

        self.stats['items_scraped'] += len(sessions)
        return sessions

    def _scrape_recent_meetings(
        self,
        year: int,
        month: int
    ) -> List[Dict[str, Any]]:
        """
        Scrape recent meetings (2020+) by generating IDs and fetching individually.

        Meeting IDs follow pattern: MTG-PL-YYYY-MM-DD
        We generate all possible IDs for the month and check which exist.

        Args:
            year: Year
            month: Month

        Returns:
            List of parsed meeting day dicts
        """
        from datetime import datetime, timedelta
        import calendar

        self.log_info(f"Fetching recent meetings for {year}-{month:02d} (individual ID method)...")

        # Get last day of month
        last_day = calendar.monthrange(year, month)[1]
        start_date = datetime(year, month, 1)
        end_date = datetime(year, month, last_day)

        meeting_days = []
        current_date = start_date

        # Try each day in the month
        # Use requests directly to avoid retry logic on expected 404s
        import requests

        while current_date <= end_date:
            meeting_id = f"MTG-PL-{current_date.strftime('%Y-%m-%d')}"
            url = f"{self.base_url}/meetings/{meeting_id}"
            params = {'format': 'application/ld+json'}

            try:
                # Direct request without retry logic
                response = requests.get(url, params=params, timeout=10)

                if response.status_code == 200:
                    data = response.json()
                    items = data.get('data', [])

                    if items:
                        item = items[0]  # Should only be one meeting per day
                        # Check if it's current term (ep-10)
                        term = item.get('parliamentary_term', '')
                        if 'ep-10' in term:
                            parsed = self._parse_api_meeting_day(item, year, month)
                            if parsed:
                                meeting_days.append(parsed)
                                self.log_info(f"  ✓ Found meeting: {meeting_id}")

            except Exception as e:
                # 404 or other errors are expected for non-meeting days - silently skip
                pass

            current_date += timedelta(days=1)

        self.log_info(f"Found {len(meeting_days)} meeting days for {year}-{month:02d}")
        return meeting_days

    def _scrape_historical_meetings(
        self,
        year: int,
        month: int
    ) -> List[Dict[str, Any]]:
        """
        Scrape historical meetings (<2020) using bulk /meetings endpoint.

        Args:
            year: Year
            month: Month

        Returns:
            List of parsed meeting day dicts
        """
        self.log_info(f"Fetching historical meetings for {year}-{month:02d} (bulk method)...")

        url = f"{self.base_url}/meetings"
        params = {
            'format': 'application/ld+json',
            'had-activity-type': 'def/ep-activities/PLENARY_SITTING',
            'limit': 1000
        }

        try:
            response = self.http.get(url, params=params)
            data = response.json()

            items = data.get('data', []) if isinstance(data, dict) else []

            # Filter to requested year/month and parse
            meeting_days = []
            for item in items:
                parsed = self._parse_api_meeting_day(item, year, month)
                if parsed:
                    meeting_days.append(parsed)

            return meeting_days

        except Exception as e:
            self.log_error(f"API parsing error: {e}")
            return []

    def _parse_api_meeting_day(
        self,
        item: Dict,
        target_year: int,
        target_month: int
    ) -> Optional[Dict[str, Any]]:
        """
        Parse individual meeting day from /meetings API response.

        Args:
            item: Raw API meeting day item
            target_year: Filter to this year
            target_month: Filter to this month

        Returns:
            Parsed meeting day dict or None if not in target month
        """
        try:
            # Extract date - handle both old and new API formats
            # Old format: {'eli-dl:activity_date': {'@value': '2019-01-14T00:00:00+01:00'}}
            # New format: {'activity_date': '2024-12-16'}
            date_str = None

            # Try old format first
            if 'eli-dl:activity_date' in item:
                date_value = item['eli-dl:activity_date']
                if isinstance(date_value, dict):
                    date_str = date_value.get('@value', '')
                else:
                    date_str = str(date_value)

            # Try new format
            if not date_str and 'activity_date' in item:
                date_str = item['activity_date']

            if not date_str:
                return None

            # Parse date (handle both full timestamps and date-only strings)
            if 'T' in date_str:
                date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            else:
                # Date-only string like "2024-12-16"
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')

            # Filter to target year/month
            if date_obj.year != target_year or date_obj.month != target_month:
                return None

            # Extract location from hasLocality URL
            # e.g., "http://publications.europa.eu/resource/authority/place/FRA_SXB" -> "Strasbourg"
            location_url = item.get('hasLocality', '')
            location = 'Unknown'
            if 'FRA_SXB' in location_url:
                location = 'Strasbourg'
            elif 'BEL_BRU' in location_url:
                location = 'Brussels'

            # Extract vote items if present
            vote_items = item.get('consists_of', [])

            return {
                'activity_id': item.get('activity_id', ''),
                'date': date_obj.date(),
                'location': location,
                'parliamentary_term': item.get('parliamentary_term', ''),
                'vote_items': vote_items,
                'vote_count': len(vote_items)
            }

        except Exception as e:
            self.log_warning(f"Failed to parse meeting day: {e}")
            return None

    def _group_days_into_sessions(
        self,
        meeting_days: List[Dict],
        year: int,
        month: int
    ) -> List[Dict[str, Any]]:
        """
        Group consecutive meeting days into sessions.

        European Parliament plenary sessions typically last 3-4 consecutive days
        (Monday-Thursday or similar). We group days that are within 1-2 days of
        each other into the same session.

        Args:
            meeting_days: List of parsed meeting day dicts
            year: Year
            month: Month

        Returns:
            List of session dictionaries
        """
        if not meeting_days:
            return []

        # Sort by date
        meeting_days.sort(key=lambda x: x['date'])

        sessions = []
        current_session_days = [meeting_days[0]]

        for i in range(1, len(meeting_days)):
            prev_date = current_session_days[-1]['date']
            curr_date = meeting_days[i]['date']

            # If days are within 2 days of each other, same session
            days_diff = (curr_date - prev_date).days

            if days_diff <= 2:
                # Same session
                current_session_days.append(meeting_days[i])
            else:
                # New session - save current one
                sessions.append(self._create_session_from_days(
                    current_session_days,
                    len(sessions) + 1,
                    year,
                    month
                ))
                # Start new session
                current_session_days = [meeting_days[i]]

        # Don't forget the last session
        if current_session_days:
            sessions.append(self._create_session_from_days(
                current_session_days,
                len(sessions) + 1,
                year,
                month
            ))

        return sessions

    def _create_session_from_days(
        self,
        days: List[Dict],
        session_num: int,
        year: int,
        month: int
    ) -> Dict[str, Any]:
        """
        Create a session dictionary from grouped meeting days.

        Args:
            days: List of meeting day dicts
            session_num: Session number (I, II, III, etc.)
            year: Year
            month: Month

        Returns:
            Session dictionary
        """
        # Roman numerals for session number
        roman = ['I', 'II', 'III', 'IV', 'V', 'VI']
        roman_num = roman[session_num - 1] if session_num <= len(roman) else str(session_num)

        # Session number format: "2024-11-I" (year-month-session)
        session_number = f"{year}-{month:02d}-{roman_num}"

        # Start and end dates
        start_date = days[0]['date']
        end_date = days[-1]['date']

        # Location (take most common or first)
        location = days[0]['location']

        # Total votes (sum of all vote items across all days)
        total_votes = sum(day['vote_count'] for day in days)

        meeting_day_ids = [d['activity_id'] for d in days if d.get('activity_id')]

        return {
            'session_number': session_number,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'session_type': 'PLENARY',
            'location': location,
            'year': year,
            'month': month,
            'total_votes': total_votes,
            'days_count': len(days),
            'meeting_day_ids': meeting_day_ids,
        }

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
