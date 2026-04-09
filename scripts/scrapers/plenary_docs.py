"""MEP plenary documents scraper using EP Open Data API v2."""
from typing import Any, Dict, List, Optional, Set

from .base import BaseScraper

EP_API_BASE = 'https://data.europarl.europa.eu/api/v2'

WORK_TYPES = ['REPORT_PLENARY', 'RESOLUTION_MOTION', 'RESOLUTION_MOTION_JOINT']

# Roles that qualify a person as an author/rapporteur for a given document type
VALID_ROLES = {
    'REPORT_PLENARY': {'RAPPORTEUR', 'RAPPORTEUR_CO'},
    'RESOLUTION_MOTION': {'AUTHOR'},
    'RESOLUTION_MOTION_JOINT': {'AUTHOR'},
}

DOCEO_URL = 'https://www.europarl.europa.eu/doceo/document/{identifier}_PL.html'

# Current parliamentary term started July 2024
TERM_YEARS = [2024, 2025, 2026]


class PlenaryDocsScraper(BaseScraper):
    """
    Scrapes plenary documents (reports, resolutions) authored by Polish MEPs.

    The /plenary-documents list endpoint has NO per-MEP filter (same as
    parliamentary questions). Strategy follows questions.py pattern:

    Phase 1 — per year + work-type: collect all document identifiers via
              paginated LIST requests (year + work-type filters).
    Phase 2 — per identifier: fetch ONE DETAIL and check workHadParticipation
              for ALL Polish MEPs at once. Return one record per matching MEP.

    This avoids redundant detail calls (1 call per document vs 53 per document).
    """

    def __init__(self):
        super().__init__(base_url=EP_API_BASE, rate_limit_seconds=2.0)

    def scrape(
        self,
        mep_ep_ids: List[int],
        years: Optional[List[int]] = None,
        known_ids: Set[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Scrape plenary documents for all Polish MEPs.

        Args:
            mep_ep_ids: List of EP numeric IDs for active Polish MEPs.
            years: Calendar years to scrape (default: all term years 2024-2026).
            known_ids: Document identifiers already in the DB — Phase 2 skips these.

        Returns:
            List of document dicts ready for upsert.
        """
        mep_set: Set[int] = set(mep_ep_ids)
        known = known_ids or set()
        target_years = years if years else TERM_YEARS

        self.log_info(
            f"Starting plenary docs scrape for {len(mep_set)} MEPs, "
            f"years={target_years}, work-types={WORK_TYPES}"
            + (f", skipping {len(known)} known IDs" if known else "")
        )
        all_docs: List[Dict[str, Any]] = []

        for work_type in WORK_TYPES:
            for year in target_years:
                self.log_info(
                    f"Phase 1 — collecting identifiers: {work_type} / {year}"
                )
                identifiers = self._collect_identifiers(work_type, year)
                new_identifiers = [i for i in identifiers if i not in known]
                self.log_info(
                    f"  Found {len(identifiers)}, {len(new_identifiers)} new"
                )

                if not new_identifiers:
                    continue

                self.log_info(
                    f"Phase 2 — fetching details for {len(new_identifiers)} docs …"
                )
                found = 0
                for identifier in new_identifiers:
                    docs = self._fetch_detail_for_all_meps(
                        identifier, mep_set, work_type
                    )
                    all_docs.extend(docs)
                    found += len(docs)
                    self.stats['items_scraped'] += len(docs)

                self.log_info(
                    f"  Matched {found} MEP-document pairs for "
                    f"{work_type} / {year}"
                )

        return all_docs

    def _collect_identifiers(self, work_type: str, year: int) -> List[str]:
        """
        Paginate through the list endpoint to collect document identifiers
        for a given work-type and year.
        """
        identifiers: List[str] = []
        offset = 0
        limit = 50
        url = f"{EP_API_BASE}/plenary-documents"

        while True:
            try:
                response = self.http.get(url, params={
                    'work-type': work_type,
                    'year': year,
                    'format': 'application/ld+json',
                    'limit': limit,
                    'offset': offset,
                })
                data = response.json()
            except Exception as e:
                self.log_error(
                    f"Failed to fetch {work_type}/{year} list at offset={offset}: {e}"
                )
                break

            items = data.get('data', [])
            if not items:
                break

            for item in items:
                identifier = item.get('identifier')
                if identifier:
                    identifiers.append(identifier)

            if len(items) < limit:
                break
            offset += limit

        return identifiers

    def _fetch_detail_for_all_meps(
        self,
        identifier: str,
        mep_set: Set[int],
        work_type: str,
    ) -> List[Dict[str, Any]]:
        """
        Fetch detail for a single document and return one record for each
        matching Polish MEP found in workHadParticipation.
        """
        url = f"{EP_API_BASE}/plenary-documents/{identifier}"
        try:
            response = self.http.get(url, params={
                'format': 'application/ld+json',
            })
            data = response.json()
        except Exception as e:
            self.log_error(f"Failed to fetch detail for {identifier}: {e}")
            return []

        items = data.get('data', [])
        if not items:
            return []
        item = items[0]

        # Title: title_dcterms.pl → .en → label fallback
        title_dcterms = item.get('title_dcterms', {})
        if isinstance(title_dcterms, dict):
            title = (
                title_dcterms.get('pl')
                or title_dcterms.get('en')
                or next(iter(title_dcterms.values()), None)
            )
        else:
            title = None
        if not title:
            title = item.get('label', identifier)

        document_date = item.get('document_date')  # "YYYY-MM-DD" or None
        participations = item.get('workHadParticipation', [])

        results: List[Dict[str, Any]] = []
        valid_roles = VALID_ROLES.get(work_type, set())

        for p in participations:
            participants = p.get('had_participant_person', [])
            if not isinstance(participants, list):
                participants = [participants]

            for person_ref in participants:
                # person_ref is like "person/257064"
                if not isinstance(person_ref, str) or not person_ref.startswith('person/'):
                    continue
                try:
                    ep_id = int(person_ref.split('/')[-1])
                except ValueError:
                    continue

                if ep_id not in mep_set:
                    continue

                # Check role
                role_uri = p.get('participation_role', '')
                role = role_uri.split('/')[-1] if role_uri else ''
                if role not in valid_roles:
                    continue

                # Extract committee
                in_name_of = p.get('participation_in_name_of', '')
                committee = in_name_of.split('/')[-1] if in_name_of else None

                doc_url = DOCEO_URL.format(identifier=identifier)

                results.append({
                    'mep_ep_id': ep_id,
                    'ep_document_id': identifier,
                    'document_type': work_type,
                    'title': title,
                    'document_date': document_date,
                    'role': role,
                    'committee': committee,
                    'doc_url': doc_url,
                })

        return results

    def validate(self, data: List[Dict]) -> List[Dict]:
        """Filter out records missing required fields."""
        required = {'ep_document_id', 'document_type', 'title', 'doc_url', 'mep_ep_id'}
        valid = []
        for item in data:
            missing = required - {k for k, v in item.items() if v is not None and v != ''}
            if missing:
                self.log_warning(
                    f"Skipping document {item.get('ep_document_id')}: missing {missing}"
                )
                self.stats['items_invalid'] += 1
            else:
                valid.append(item)
                self.stats['items_valid'] += 1
        return valid
