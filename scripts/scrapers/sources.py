"""
Scraper for building vote source URL records.

Sources are reference links shown to users on vote detail pages,
allowing them to read the original EP documents behind a vote.

Three tiers of data collection:

  Tier 1 — no API calls, derived from data already in DB:
    - RCV_XML: Roll-call vote XML  (from session_number)
    - VOT_XML: Vote results XML    (from session_number)
    - REPORT:  Committee report    (from dec_label doc_ref → doceo URL)

  Tier 2 — 1 EP API call per unique doc_id:
    - PROCEDURE_OEIL: Legislative Observatory procedure file
                      (via /plenary-documents/{doc_id})

  Tier 3 — async pipeline, separate from this scraper:
    - PRESS_RELEASE:  EP press room article
                      (RSS discovery + HTML scraping, ~4 weeks latency)

Usage:
    from scripts.scrapers.sources import SourcesScraper

    with SourcesScraper() as scraper:
        # Tier 1: fast, no network calls
        sources = scraper.build_sources_from_existing(
            vote_number="185885",
            dec_label="A10-0244/2025 - Andrzej Buła - całość tekstu",
            session_number="MTG-PL-2025-12-17",
        )

        # Tier 2: one API call per doc_id
        for src in sources:
            if src['source_type'] == 'REPORT' and src.get('_doc_id'):
                proc_src = scraper.fetch_procedure_source(
                    vote_number=src['vote_number'],
                    doc_id=src['_doc_id'],
                )
                if proc_src:
                    sources.append(proc_src)
"""

import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from .base import BaseScraper

# EP legislature term (10th term, started July 2024)
EP_TERM = 10

# Human-readable names for each source type (shown in the UI)
SOURCE_NAMES: Dict[str, str] = {
    'RCV_XML':        'Results of roll-call votes (XML)',
    'VOT_XML':        'Results of votes (XML)',
    'REPORT':         'Report or resolution',
    'PROCEDURE_OEIL': 'Procedure file (Legislative Observatory)',
    'PRESS_RELEASE':  'Press release',
}


class SourcesScraper(BaseScraper):
    """
    Builds vote_sources records from EP documents and APIs.

    Designed to run as a separate pass after votes are loaded into the DB.
    All methods are stateless — they accept vote data and return source dicts
    ready for insertion into the vote_sources table.
    """

    API_BASE_URL = "https://data.europarl.europa.eu/api/v2"
    DOCEO_BASE   = "https://www.europarl.europa.eu/doceo/document"
    OEIL_BASE    = "https://oeil.secure.europarl.europa.eu/oeil/en/procedure-file"

    def __init__(self):
        super().__init__(
            base_url=self.API_BASE_URL,
            rate_limit_seconds=2.0,
        )

    # BaseScraper requires these abstract methods — not used by SourcesScraper
    # directly (logic lives in build_sources_from_existing / fetch_procedure_source)
    def scrape(self, **kwargs) -> list:
        raise NotImplementedError(
            "Use build_sources_from_existing() and fetch_procedure_source() instead"
        )

    def validate(self, data: list) -> list:
        return data

    # ─────────────────────────────────────────────────────────────────────────
    # Tier 1: Build sources from existing DB data (no API calls)
    # ─────────────────────────────────────────────────────────────────────────

    def build_sources_from_existing(
        self,
        vote_number: str,
        dec_label: Optional[str],
        session_number: str,
    ) -> List[Dict[str, Any]]:
        """
        Build Tier 1 source records from data already in the DB.

        Creates RCV_XML and VOT_XML for every vote (derived from session date),
        and a REPORT source when dec_label contains a parseable doc reference.

        The returned list may contain a special '_doc_id' key on REPORT entries
        (not stored in DB — used by populate_vote_sources.py to trigger Tier 2).

        Args:
            vote_number:    Vote identifier, e.g. "185885"
            dec_label:      Full DEC label from votes.dec_label, e.g.
                            "A10-0244/2025 - Andrzej Buła - całość tekstu"
            session_number: From voting_sessions.session_number, e.g.
                            "MTG-PL-2025-12-17"

        Returns:
            List of source dicts with keys: vote_number, url, name, source_type
            (REPORT entries also carry a temporary _doc_id key)
        """
        sources: List[Dict[str, Any]] = []

        # ── RCV_XML and VOT_XML: derived from session date ───────────────────
        session_date = self._session_to_date(session_number)
        if session_date:
            for stype in ('RCV_XML', 'VOT_XML'):
                suffix = 'RCV' if stype == 'RCV_XML' else 'VOT'
                url = (
                    f"{self.DOCEO_BASE}"
                    f"/PV-{EP_TERM}-{session_date}-{suffix}_EN.xml"
                )
                sources.append({
                    'vote_number': vote_number,
                    'url':         url,
                    'name':        SOURCE_NAMES[stype],
                    'source_type': stype,
                })
        else:
            self.log_warning(
                f"Cannot extract date from session_number: {session_number}"
            )

        # ── REPORT: derived from doc_ref in dec_label ────────────────────────
        if dec_label:
            doc_ref = self._extract_doc_ref(dec_label)
            if doc_ref:
                doc_id = self._doc_ref_to_doc_id(doc_ref)
                if doc_id:
                    url = f"{self.DOCEO_BASE}/{doc_id}_EN.html"
                    sources.append({
                        'vote_number': vote_number,
                        'url':         url,
                        'name':        SOURCE_NAMES['REPORT'],
                        'source_type': 'REPORT',
                        '_doc_id':     doc_id,   # temp key — used for Tier 2 lookup
                    })

        return sources

    # ─────────────────────────────────────────────────────────────────────────
    # Tier 2: Fetch PROCEDURE_OEIL source via EP API
    # ─────────────────────────────────────────────────────────────────────────

    def fetch_procedure_source(
        self,
        vote_number: str,
        doc_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch PROCEDURE_OEIL source for a vote via two EP API calls.

        Step 1: GET /plenary-documents/{doc_id}
                → extracts internal proc_id from 'inverse_created_a_realization_of'
                  e.g. "eli/dl/proc/2025-0045" → proc_id = "2025-0045"

        Step 2: GET /procedures/{proc_id}
                → extracts 'label' field which is the OEIL reference
                  e.g. label = "2025/0045(COD)"

        Then builds: https://oeil.../procedure-file?reference=2025/0045(COD)

        Args:
            vote_number: Vote identifier (for the source record)
            doc_id:      EP doceo format doc ID, e.g. "A-10-2025-0197"

        Returns:
            Source dict or None if procedure reference cannot be determined
        """
        # ── Step 1: plenary document → proc_id ───────────────────────────────
        proc_id = self._fetch_proc_id_from_document(doc_id)
        if not proc_id:
            return None

        # ── Step 2: procedure → OEIL label ───────────────────────────────────
        proc_ref = self._fetch_proc_label(proc_id)
        if not proc_ref:
            return None

        oeil_url = f"{self.OEIL_BASE}?reference={proc_ref}"
        self.log_info(
            f"Found procedure {proc_ref} for doc {doc_id} (proc {proc_id})"
        )
        return {
            'vote_number': vote_number,
            'url':         oeil_url,
            'name':        SOURCE_NAMES['PROCEDURE_OEIL'],
            'source_type': 'PROCEDURE_OEIL',
        }

    def _fetch_proc_id_from_document(self, doc_id: str) -> Optional[str]:
        """
        Call /plenary-documents/{doc_id} and extract the internal procedure ID
        from the 'inverse_created_a_realization_of' field.

        e.g. ["eli/dl/proc/2025-0045"] → "2025-0045"
        """
        url = f"{self.base_url}/plenary-documents/{doc_id}"
        params = {'format': 'application/ld+json'}

        try:
            response = self.http.get(url, params=params, timeout=30)
            if response.status_code == 404:
                self.log_info(f"Plenary document not found: {doc_id}")
                return None
            response.raise_for_status()
            data = response.json()

            # Normalize response
            items: List[Any] = []
            if isinstance(data, dict):
                raw = data.get('data', data)
                items = raw if isinstance(raw, list) else [raw]
            elif isinstance(data, list):
                items = data

            for item in items:
                if not isinstance(item, dict):
                    continue
                # 'inverse_created_a_realization_of' → ["eli/dl/proc/YYYY-NNNN"]
                refs = item.get('inverse_created_a_realization_of', [])
                if not isinstance(refs, list):
                    refs = [refs]
                for ref in refs:
                    uri = ref if isinstance(ref, str) else ref.get('id', '')
                    # Extract proc ID: "eli/dl/proc/2025-0045" → "2025-0045"
                    match = re.search(r'eli/dl/proc/(\d{4}-\d+)', uri)
                    if match:
                        return match.group(1)

        except Exception as e:
            self.log_warning(f"Failed to fetch plenary document {doc_id}: {e}")

        return None

    def _fetch_proc_label(self, proc_id: str) -> Optional[str]:
        """
        Call /procedures/{proc_id} and return the 'label' field.

        The label is the OEIL-compatible procedure reference, e.g. "2025/0045(COD)".

        e.g. proc_id = "2025-0045" → GET /procedures/2025-0045
             → label = "2025/0045(COD)"
        """
        url = f"{self.base_url}/procedures/{proc_id}"
        params = {'format': 'application/ld+json'}

        try:
            response = self.http.get(url, params=params, timeout=30)
            if response.status_code == 404:
                self.log_info(f"Procedure not found: {proc_id}")
                return None
            response.raise_for_status()
            data = response.json()

            # Normalize response
            items: List[Any] = []
            if isinstance(data, dict):
                raw = data.get('data', data)
                items = raw if isinstance(raw, list) else [raw]
            elif isinstance(data, list):
                items = data

            for item in items:
                if not isinstance(item, dict):
                    continue
                label = item.get('label')
                if label and re.match(r'\d{4}/\d+\([A-Z]+\)', label):
                    return label

        except Exception as e:
            self.log_warning(f"Failed to fetch procedure {proc_id}: {e}")

        return None

    # ─────────────────────────────────────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _session_to_date(self, session_number: str) -> Optional[str]:
        """
        Extract YYYY-MM-DD date string from session_number.

        Args:
            session_number: e.g. "MTG-PL-2025-12-17"

        Returns:
            "2025-12-17" or None if pattern not found
        """
        match = re.search(r'(\d{4}-\d{2}-\d{2})$', session_number)
        return match.group(1) if match else None

    def _extract_doc_ref(self, dec_label: str) -> Optional[str]:
        """
        Extract document reference from the start of a dec_label string.

        dec_label format:
          "A10-0244/2025 - Andrzej Buła - całość tekstu"
          "B10-0558/2025 - Agnieszka Pomaska, ... - całość tekstu"

        Returns the first part before ' - ' if it looks like a doc ref
        (letters+digits+dash, then /year). Returns None for procedural labels
        like "Porządek dzienny" that have no document reference.
        """
        if not dec_label or ' - ' not in dec_label:
            return None

        candidate = dec_label.split(' - ')[0].strip()

        # Must start with capital letters and match doc ref pattern
        if re.match(r'^[A-Z][A-Z0-9\-]*\d{1,2}-\d+/\d{4}$', candidate):
            return candidate

        return None

    def _doc_ref_to_doc_id(self, doc_ref: str) -> Optional[str]:
        """
        Transform EP document reference to the EP doceo doc_id format.

        The dec_label in the DB uses the "human" EP reference format.
        EP doceo URLs use a different format derived from ELI URIs.

        Transformation:
          {PREFIX}{TERM}-{NUM}/{YEAR}  →  {PREFIX}-{TERM}-{YEAR}-{NUM}

        Examples:
          A10-0244/2025    →  A-10-2025-0244
          B10-0558/2025    →  B-10-2025-0558
          RC-B10-0557/2025 →  RC-B-10-2025-0557

        This matches the tail of EP ELI URIs like:
          "eli/dl/doc/A-10-2025-0244"

        Args:
            doc_ref: Document reference in dec_label format, e.g. "A10-0244/2025"

        Returns:
            EP doceo doc_id string, e.g. "A-10-2025-0244", or None if unparseable
        """
        # Regex breakdown:
        #   ([A-Z]+(?:-[A-Z]+)*)  — prefix: one or more uppercase letter blocks
        #                            separated by dashes, e.g. "A", "RC-B"
        #   (\d{1,2})             — term number, e.g. "10"
        #   -(\d{3,6})            — doc number, e.g. "0244"
        #   /(\d{4})              — year, e.g. "2025"
        match = re.match(
            r'^([A-Z]+(?:-[A-Z]+)*)(\d{1,2})-(\d{3,6})/(\d{4})$',
            doc_ref,
        )
        if not match:
            self.log_warning(f"Cannot parse doc_ref format: '{doc_ref}'")
            return None

        prefix = match.group(1)   # "A", "B", "RC-B"
        term   = match.group(2)   # "10"
        num    = match.group(3)   # "0244"
        year   = match.group(4)   # "2025"

        return f"{prefix}-{term}-{year}-{num}"
