"""Scraper for Polish MEPs (Members of European Parliament)."""
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from .base import BaseScraper


class MEPsScraper(BaseScraper):
    """Scraper for Polish MEPs list."""

    # European Parliament Open Data Portal API
    API_BASE_URL = "https://data.europarl.europa.eu/api/v2"

    # Fallback: Official website
    WEB_BASE_URL = "https://www.europarl.europa.eu"

    def __init__(self):
        """Initialize MEPs scraper."""
        super().__init__(
            base_url=self.API_BASE_URL,
            rate_limit_seconds=2.0
        )

    def scrape(self, term: int = 10) -> List[Dict[str, Any]]:
        """
        Scrape list of Polish MEPs.

        Args:
            term: Parliamentary term (10 = current term 2024-2029)

        Returns:
            List of MEP data dictionaries
        """
        self.log_info(f"Starting MEPs scraping for term {term}...")

        # Try primary source (API) first
        try:
            meps = self._scrape_from_api(term)
            if meps:
                self.log_info(f"✓ Scraped {len(meps)} MEPs from API")
                return meps
        except Exception as e:
            self.log_error(f"API scraping failed: {e}", exc_info=True)
            self.log_warning("Falling back to web scraping...")

        # Fallback to web scraping
        try:
            meps = self._scrape_from_web()
            if meps:
                self.log_info(f"✓ Scraped {len(meps)} MEPs from website")
                return meps
        except Exception as e:
            self.log_error(f"Web scraping failed: {e}", exc_info=True)
            raise RuntimeError("All scraping methods failed")

        return []

    def _scrape_from_api(self, term: int) -> List[Dict[str, Any]]:
        """
        Scrape MEPs from European Parliament Open Data API.

        Args:
            term: Parliamentary term number

        Returns:
            List of MEP dictionaries

        Note:
            API endpoint format may change. This is a simplified version.
            Real implementation should check actual API documentation.
        """
        self.log_info("Attempting to scrape from EP Open Data API...")

        # Note: This is a simplified example. The actual EP API structure
        # may be different. You'll need to verify the actual endpoint.

        # Example endpoint (may need adjustment based on actual API)
        url = f"{self.base_url}/meps"
        params = {
            'country-code': 'POL',  # Poland
            'term': term,
            'format': 'application/json'
        }

        try:
            response = self.http.get(url, params=params)
            data = response.json()

            meps = []
            items = data.get('data', []) if isinstance(data, dict) else data

            for item in items:
                mep = self._parse_api_mep(item)
                if mep:
                    meps.append(mep)
                    self.stats['items_scraped'] += 1

            return meps

        except Exception as e:
            self.log_error(f"API parsing error: {e}")
            # Return empty list to trigger fallback
            return []

    def _parse_api_mep(self, item: Dict) -> Optional[Dict[str, Any]]:
        """
        Parse MEP data from API response.

        Args:
            item: Raw API data item

        Returns:
            Parsed MEP dictionary or None if invalid
        """
        try:
            # Extract data (field names may vary based on actual API)
            mep = {
                'ep_id': self._extract_int(item, ['id', 'mepId', 'identifier']),
                'full_name': self._extract_str(item, ['label', 'fullName', 'name']),
                'first_name': self._extract_str(item, ['givenName', 'firstName']),
                'last_name': self._extract_str(item, ['familyName', 'lastName', 'surname']),
                'national_party': self._extract_nested(item, ['nationalParty', 'label']),
                'ep_group': self._extract_nested(item, ['politicalGroup', 'label']),
                'email': self._extract_str(item, ['email', 'contactEmail']),
                'photo_url': self._extract_str(item, ['img', 'photoUrl', 'image']),
                'website_url': self._extract_str(item, ['homepage', 'websiteUrl']),
                'term_start': self._extract_date(item, ['mandateStartDate', 'termStart']),
                'term_end': self._extract_date(item, ['mandateEndDate', 'termEnd']),
                'is_active': item.get('isActive', True)
            }

            # Generate slug if not provided
            if not mep.get('slug'):
                mep['slug'] = self._generate_slug(mep['full_name'])

            return mep

        except Exception as e:
            self.log_warning(f"Failed to parse MEP: {e}")
            return None

    def _scrape_from_web(self) -> List[Dict[str, Any]]:
        """
        Scrape MEPs from official website (fallback method).

        Returns:
            List of MEP dictionaries

        Note:
            This is a placeholder. Actual implementation would use
            BeautifulSoup to parse HTML.
        """
        self.log_warning("Web scraping not fully implemented yet")
        self.log_info("Using mock data for testing...")

        # TODO: Implement actual web scraping with BeautifulSoup
        # For now, return empty list to avoid errors
        return []

    def validate(self, data: List[Dict]) -> List[Dict]:
        """
        Validate MEP data.

        Args:
            data: List of scraped MEP dictionaries

        Returns:
            List of valid MEP dictionaries
        """
        valid_meps = []

        for mep in data:
            # Required fields
            if not mep.get('ep_id'):
                self.log_warning(f"Missing ep_id for MEP: {mep.get('full_name')}")
                self.stats['items_invalid'] += 1
                continue

            if not mep.get('full_name'):
                self.log_warning(f"Missing full_name for MEP ID: {mep.get('ep_id')}")
                self.stats['items_invalid'] += 1
                continue

            # Validate EP ID format (positive integer)
            if not isinstance(mep['ep_id'], int) or mep['ep_id'] <= 0:
                self.log_warning(f"Invalid ep_id: {mep['ep_id']}")
                self.stats['items_invalid'] += 1
                continue

            # Generate slug if missing
            if not mep.get('slug'):
                mep['slug'] = self._generate_slug(mep['full_name'])

            # Validate slug format
            if not re.match(r'^[a-z0-9-]+$', mep['slug']):
                self.log_warning(f"Invalid slug format: {mep['slug']}")
                # Try to fix it
                mep['slug'] = self._generate_slug(mep['full_name'])

            valid_meps.append(mep)
            self.stats['items_valid'] += 1

        self.log_info(f"Validated {len(valid_meps)}/{len(data)} MEPs")
        return valid_meps

    def _generate_slug(self, full_name: str) -> str:
        """
        Generate URL-friendly slug from name.

        Args:
            full_name: MEP's full name

        Returns:
            URL-friendly slug

        Examples:
            "Jan Kowalski" -> "jan-kowalski"
            "Anna Maria Żukowska" -> "anna-maria-zukowska"
        """
        if not full_name:
            return "unknown"

        # Convert to lowercase
        slug = full_name.lower()

        # Replace Polish characters
        replacements = {
            'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l',
            'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z'
        }
        for pl_char, en_char in replacements.items():
            slug = slug.replace(pl_char, en_char)

        # Replace non-alphanumeric with hyphens
        slug = re.sub(r'[^a-z0-9]+', '-', slug)

        # Remove leading/trailing hyphens
        slug = slug.strip('-')

        # Remove consecutive hyphens
        slug = re.sub(r'-+', '-', slug)

        return slug

    # Helper methods for extracting data from various formats

    def _extract_int(self, data: Dict, keys: List[str]) -> Optional[int]:
        """Try to extract integer from multiple possible keys."""
        for key in keys:
            if key in data and data[key] is not None:
                try:
                    return int(data[key])
                except (ValueError, TypeError):
                    continue
        return None

    def _extract_str(self, data: Dict, keys: List[str]) -> Optional[str]:
        """Try to extract string from multiple possible keys."""
        for key in keys:
            if key in data and data[key]:
                return str(data[key]).strip()
        return None

    def _extract_nested(self, data: Dict, path: List[str]) -> Optional[str]:
        """Extract value from nested dictionary path."""
        current = data
        for key in path[:-1]:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None

        last_key = path[-1]
        if isinstance(current, dict) and last_key in current:
            value = current[last_key]
            return str(value).strip() if value else None
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
                            dt = datetime.strptime(date_str.split('T')[0], fmt.split('T')[0])
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

    with MEPsScraper() as scraper:
        # Scrape MEPs
        meps = scraper.scrape(term=10)

        # Validate
        valid_meps = scraper.validate(meps)

        # Print summary
        scraper.print_summary()

        # Show sample
        if valid_meps:
            print("\nSample MEP:")
            print(valid_meps[0])
