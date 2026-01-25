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

        # Official EP API endpoint (verified)
        # Documentation: https://data.europarl.europa.eu/pl/developer-corner/opendata-api
        # Working endpoint: https://data.europarl.europa.eu/api/v2/meps?country-of-representation=PL&format=application%2Fld%2Bjson&parliamentary-term=10
        url = f"{self.base_url}/meps"
        params = {
            'country-of-representation': 'PL',  # Poland
            'parliamentary-term': str(term),
            'format': 'application/ld+json'  # JSON-LD format
        }

        try:
            response = self.http.get(url, params=params)
            data = response.json()

            meps = []

            # Handle JSON-LD format response
            # The API returns data in different structures
            if isinstance(data, dict):
                # Try different possible data containers
                items = (
                    data.get('data', []) or
                    data.get('@graph', []) or
                    data.get('ldPage', {}).get('result', []) or
                    []
                )
            elif isinstance(data, list):
                items = data
            else:
                self.log_error(f"Unexpected API response format: {type(data)}")
                return []

            self.log_info(f"Found {len(items)} MEPs in API response")

            # First pass: get basic info from list
            for item in items:
                mep = self._parse_api_mep(item)
                if mep:
                    meps.append(mep)

            # Second pass: enrich with detailed info from individual endpoints
            self.log_info(f"Fetching detailed info for {len(meps)} MEPs...")
            enriched_meps = []
            for mep in meps:
                detailed_mep = self._fetch_mep_details(mep)
                if detailed_mep:
                    enriched_meps.append(detailed_mep)
                    self.stats['items_scraped'] += 1

            return enriched_meps

        except Exception as e:
            self.log_error(f"API parsing error: {e}")
            # Return empty list to trigger fallback
            return []

    def _parse_api_mep(self, item: Dict) -> Optional[Dict[str, Any]]:
        """
        Parse MEP data from API response.

        Args:
            item: Raw API data item from EP API v2

        Returns:
            Parsed MEP dictionary or None if invalid

        Note:
            EP API v2 returns basic info in list endpoint.
            For full details (party, group, email), need to call individual MEP endpoint.
            For MVP, we store basic info and can enhance later.
        """
        try:
            # Extract EP ID (from 'identifier' field)
            ep_id = self._extract_int(item, ['identifier', 'id', 'notation_codictPersonId'])

            if not ep_id:
                # Try parsing from 'id' field like "person/124877"
                id_str = item.get('id', '')
                if '/' in id_str:
                    try:
                        ep_id = int(id_str.split('/')[-1])
                    except ValueError:
                        pass

            # Extract names
            full_name = self._extract_str(item, ['label', 'fullName', 'name'])
            first_name = self._extract_str(item, ['givenName', 'firstName'])
            last_name = self._extract_str(item, ['familyName', 'lastName', 'surname'])

            # Extract email (if present in basic response)
            email = self._extract_str(item, ['hasEmail', 'email', 'contactEmail'])
            if email and email.startswith('mailto:'):
                email = email.replace('mailto:', '')

            # Build MEP dict with available data
            mep = {
                'ep_id': ep_id,
                'full_name': full_name,
                'first_name': first_name,
                'last_name': last_name,
                'national_party': None,  # Not in basic API response
                'ep_group': None,  # Not in basic API response
                'email': email,
                'photo_url': None,  # Not in basic API response
                'website_url': None,  # Not in basic API response
                'term_start': None,  # Not in basic API response
                'term_end': None,  # Not in basic API response
                'is_active': True  # Assume active if returned by API
            }

            # Generate slug
            if not mep.get('slug'):
                mep['slug'] = self._generate_slug(mep['full_name'])

            return mep

        except Exception as e:
            self.log_warning(f"Failed to parse MEP: {e}")
            return None

    def _fetch_mep_details(self, mep: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Fetch detailed information for a specific MEP from individual endpoint.

        Args:
            mep: Basic MEP dict with at least ep_id

        Returns:
            Enhanced MEP dict with full details or None if fetch fails
        """
        ep_id = mep.get('ep_id')
        if not ep_id:
            return mep

        try:
            # Individual MEP endpoint
            url = f"{self.base_url}/meps/{ep_id}"
            params = {'format': 'application/ld+json'}

            response = self.http.get(url, params=params)
            data = response.json()

            # Extract detailed info
            items = data.get('data', [])
            if not items:
                return mep

            detail = items[0]

            # Extract email
            email = detail.get('hasEmail', '')
            if email and email.startswith('mailto:'):
                email = email.replace('mailto:', '')
                mep['email'] = email

            # Extract photo URL
            photo_url = detail.get('img', '')
            if photo_url:
                mep['photo_url'] = photo_url

            # Extract current memberships (hasMembership array)
            memberships = detail.get('hasMembership', [])

            # Find current mandate (MEMBER_PARLIAMENT role)
            current_mandate = None
            for membership in memberships:
                role = membership.get('role', '')
                if 'MEMBER_PARLIAMENT' in role:
                    member_during = membership.get('memberDuring', {})
                    end_date = member_during.get('endDate')
                    # If no end date or end date is in future, it's current
                    if not end_date or end_date >= '2024':
                        current_mandate = membership
                        break

            if current_mandate:
                member_during = current_mandate.get('memberDuring', {})
                mep['term_start'] = member_during.get('startDate')
                mep['term_end'] = member_during.get('endDate')

            # Find current EU political group
            for membership in memberships:
                classification = membership.get('membershipClassification', '')
                if 'EU_POLITICAL_GROUP' in classification:
                    member_during = membership.get('memberDuring', {})
                    end_date = member_during.get('endDate')
                    # Current group (no end date = ongoing)
                    if not end_date:
                        org_id = membership.get('organization', '')
                        # Map organization ID to group name (simplified)
                        mep['ep_group'] = self._get_group_name(org_id)
                        break

            # Find national political party
            for membership in memberships:
                classification = membership.get('membershipClassification', '')
                if 'NATIONAL_POLITICAL_GROUP' in classification:
                    member_during = membership.get('memberDuring', {})
                    end_date = member_during.get('endDate')
                    # Current party (no end date = ongoing)
                    if not end_date:
                        org_id = membership.get('organization', '')
                        mep['national_party'] = self._get_party_name(org_id)
                        break

            self.log_info(f"  ✓ Enriched: {mep['full_name']}")
            return mep

        except Exception as e:
            self.log_warning(f"Failed to fetch details for MEP {ep_id}: {e}")
            return mep  # Return basic info if detail fetch fails

    def _get_group_name(self, org_id: str) -> Optional[str]:
        """Map organization ID to EP group name."""
        from scripts.utils.ep_organizations import get_group_short_name
        return get_group_short_name(org_id)

    def _get_party_name(self, org_id: str) -> Optional[str]:
        """Map organization ID to national party name."""
        from scripts.utils.ep_organizations import get_party_short_name
        return get_party_short_name(org_id)

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
