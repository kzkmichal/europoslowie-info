"""MEP speeches scraper using EP Open Data API v2."""
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Any, Dict, List, Optional

from .base import BaseScraper

EP_API_BASE = 'https://data.europarl.europa.eu/api/v2'


class SpeechesScraper(BaseScraper):
    """
    Scrapes plenary speeches for Polish MEPs.

    The /speeches endpoint supports a dedicated per-MEP filter (person-id),
    so no pre-filtering is needed — one paginated request per MEP.
    Language is set to 'pl' so debate_topic comes back in Polish.
    """

    def __init__(self):
        super().__init__(base_url=EP_API_BASE, rate_limit_seconds=2.0)

    def scrape(
        self, mep_ep_ids: List[int], year: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Scrape speeches for every MEP in mep_ep_ids.

        Args:
            mep_ep_ids: List of EP numeric IDs for active Polish MEPs.
            year: If provided, only keep speeches from that calendar year.
                  The API has no server-side date filter, so filtering is done
                  client-side.

        Returns:
            List of speech dicts ready for upsert.
        """
        self.log_info(
            f"Starting speeches scrape for {len(mep_ep_ids)} MEPs"
            + (f" (year={year})" if year else " (all years)")
        )
        all_speeches = []

        for ep_id in mep_ep_ids:
            speeches = self._scrape_for_mep(ep_id, year=year)
            all_speeches.extend(speeches)
            self.stats['items_scraped'] += len(speeches)
            self.log_info(f"  MEP {ep_id}: {len(speeches)} speeches")

        return all_speeches

    def _scrape_for_mep(self, ep_id: int, year: Optional[int] = None) -> List[Dict[str, Any]]:
        """Paginate through speeches for a single MEP."""
        speeches = []
        offset = 0
        limit = 50
        url = f"{EP_API_BASE}/speeches"

        while True:
            try:
                response = self.http.get(url, params={
                    'parliamentary-term': 10,
                    'person-id': ep_id,
                    'language': 'pl',
                    'search-language': 'pl',
                    'include-output': 'xml_fragment',
                    'format': 'application/ld+json',
                    'limit': limit,
                    'offset': offset,
                })
                data = response.json()
            except Exception as e:
                self.log_error(f"Failed to fetch speeches for MEP {ep_id} offset={offset}: {e}")
                break

            items = data.get('data', [])
            if not items:
                break

            for item in items:
                speech = self._parse_speech(item, ep_id)
                if not speech:
                    continue
                # Client-side year filter (API has no date param for speeches)
                if year and not str(speech['speech_date']).startswith(str(year)):
                    continue
                speeches.append(speech)

            # Early stop: API returns speeches sorted oldest-first within the term.
            # Once all items on a page are older than the target year, stop paging.
            if year and items:
                last_date = items[-1].get('activity_date', '')
                if last_date and int(last_date[:4]) > year:
                    break

            if len(items) < limit:
                break

            offset += limit

        return speeches

    def _parse_speech(self, item: dict, ep_id: int) -> Optional[Dict[str, Any]]:
        """Parse a single speech record from the API response."""
        ep_activity_id = item.get('activity_id')
        if not ep_activity_id:
            return None

        # debate_topic comes from activity_label (API returns the requested language)
        activity_label = item.get('activity_label', {})
        if isinstance(activity_label, dict):
            debate_topic = (
                activity_label.get('pl')
                or activity_label.get('en')
                or next(iter(activity_label.values()), None)
            )
        else:
            debate_topic = str(activity_label) if activity_label else None

        speech_date = item.get('activity_date')
        if not speech_date:
            return None

        # Duration from start/end timestamps (both optional)
        duration_seconds = self._calc_duration(
            item.get('activity_start_date'),
            item.get('activity_end_date'),
        )

        # Transcript from xml_fragment (included when include-output=xml_fragment)
        transcript = self._extract_transcript(item)

        return {
            'mep_ep_id': ep_id,
            'ep_activity_id': ep_activity_id,
            'debate_topic': debate_topic or 'Brak tematu',
            'speech_date': speech_date,
            'duration_seconds': duration_seconds,
            'transcript': transcript,
        }

    @staticmethod
    def _extract_transcript(item: dict) -> Optional[str]:
        """
        Extract plain speech text from api:xmlFragment.

        The XML structure is:
          <oralStatements>
            <speech>
              <from>...</from>
              <blockContainer>
                <p>paragraph text</p>
                ...
              </blockContainer>
            </speech>
          </oralStatements>

        Returns the <p> paragraphs joined by newlines, or None.
        """
        realizations = item.get('recorded_in_a_realization_of', [])
        if not realizations:
            return None

        xml_fragment = realizations[0].get('api:xmlFragment', {})
        xml_str = xml_fragment.get('pl') if isinstance(xml_fragment, dict) else None
        if not xml_str:
            return None

        try:
            root = ET.fromstring(xml_str)
            # Collect text from all <p> elements (ignore <from> header)
            paragraphs = []
            for p in root.iter('p'):
                text = ''.join(p.itertext()).strip()
                if text:
                    paragraphs.append(text)
            return '\n\n'.join(paragraphs) if paragraphs else None
        except ET.ParseError:
            return None

    @staticmethod
    def _calc_duration(start: Optional[str], end: Optional[str]) -> Optional[int]:
        """Return duration in seconds between two ISO datetime strings, or None."""
        if not start or not end:
            return None
        try:
            fmt = '%Y-%m-%dT%H:%M:%S'
            # Handle optional timezone offset or Z suffix
            t_start = datetime.fromisoformat(start.replace('Z', '+00:00'))
            t_end = datetime.fromisoformat(end.replace('Z', '+00:00'))
            delta = t_end - t_start
            seconds = int(delta.total_seconds())
            return seconds if seconds > 0 else None
        except Exception:
            return None

    def validate(self, data: List[Dict]) -> List[Dict]:
        """Filter out records missing required fields."""
        required = {'ep_activity_id', 'debate_topic', 'speech_date', 'mep_ep_id'}
        valid = []
        for item in data:
            missing = required - set(k for k, v in item.items() if v is not None and v != '')
            if missing:
                self.log_warning(
                    f"Skipping speech {item.get('ep_activity_id')}: missing {missing}"
                )
                self.stats['items_invalid'] += 1
            else:
                valid.append(item)
                self.stats['items_valid'] += 1

        return valid
