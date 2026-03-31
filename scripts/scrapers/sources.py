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

  Tier 3 — 1 HTML scrape per unique (procedure_ref, vote_date):
    - OEIL_SUMMARY: Summary document from Legislative Observatory
                    (scrapes procedure-file page, extracts summary link)

  Tier 4 — async pipeline, separate from this scraper:
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
from datetime import date as date_type, datetime
from typing import Any, Dict, List, Optional, Union
from urllib.parse import parse_qs, urlparse

from .base import BaseScraper

# EP legislature term (10th term, started July 2024)
EP_TERM = 10

# Human-readable names for each source type (shown in the UI)
SOURCE_NAMES: Dict[str, str] = {
    'RCV_XML':        'Results of roll-call votes (XML)',
    'VOT_XML':        'Results of votes (XML)',
    'REPORT':         'Report or resolution',
    'OEIL_SUMMARY':   'Summary (Legislative Observatory)',
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

    API_BASE_URL      = "https://data.europarl.europa.eu/api/v2"
    DOCEO_BASE        = "https://www.europarl.europa.eu/doceo/document"
    OEIL_BASE         = "https://oeil.secure.europarl.europa.eu/oeil/en/procedure-file"
    OEIL_SUMMARY_BASE = "https://oeil.europarl.europa.eu/oeil/en/document-summary"
    OEIL_HTML_BASE    = "https://oeil.europarl.europa.eu/oeil/en/procedure-file"

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
        document_reference: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Build Tier 1 source records from data already in the DB.

        Creates RCV_XML and VOT_XML for every vote (derived from session date),
        and a REPORT source when a document reference is available.

        REPORT source resolution (first match wins):
          1. document_reference column — already in doceo doc_id format
             (e.g. "A-10-2025-0195"), stored directly by the votes scraper.
             Most reliable: covers votes whose dec_label is a translation
             without a parseable doc ref (e.g. "Wstępne porozumienie - Popr. 27").
          2. dec_label parsing — fallback for rows where document_reference
             is NULL. Parses the doc_ref from the start of the dec_label string
             and converts it to doceo format.

        RC documents (dec_label starts with "RC-") are always skipped — they
        are competing resolutions / joint motions with no standalone doceo page.

        The returned list may contain a special '_doc_id' key on REPORT entries
        (not stored in DB — used by populate_vote_sources.py to trigger Tier 2).

        Args:
            vote_number:         Vote identifier, e.g. "182807"
            dec_label:           Full DEC label from votes.dec_label, e.g.
                                 "A10-0244/2025 - Andrzej Buła - całość tekstu".
                                 May be a language-specific translation with no
                                 doc_ref (e.g. "Wstępne porozumienie - Popr. 27").
            session_number:      From voting_sessions.session_number, e.g.
                                 "MTG-PL-2025-12-17"
            document_reference:  Pre-parsed doc_id from votes.document_reference,
                                 already in doceo format (e.g. "A-10-2025-0195").
                                 Takes precedence over dec_label parsing when set.

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

        # ── REPORT: prefer document_reference, fall back to dec_label ────────
        #
        # RC documents (dec_label starts with "RC-") are competing resolutions
        # (joint motions). They have no standalone doceo HTML pages, so skip.
        #
        # Detection: we check dec_label for the RC- prefix because
        # document_reference for RC-B votes is stored as the underlying B
        # document (e.g. "B-10-2026-0143") without the RC- prefix.
        if dec_label and self._extract_doc_ref(dec_label, rc_check_only=True):
            # dec_label starts with RC- → skip
            self.log_info(
                f"Skipping REPORT for vote {vote_number} "
                f"(RC competing resolution: {dec_label[:40]!r})"
            )
        else:
            doc_id = self._resolve_doc_id(document_reference, dec_label)
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

    # ─────────────────────────────────────────────────────────────────────────
    # Tier 3: Fetch OEIL_SUMMARY source via HTML scrape of procedure-file page
    # ─────────────────────────────────────────────────────────────────────────

    def fetch_summary_source(
        self,
        vote_number: str,
        procedure_ref: str,
        vote_date: Union[date_type, datetime],
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch OEIL_SUMMARY source for a vote via HTML scraping.

        Fetches the OEIL procedure-file HTML page and finds the summary link
        for the given vote date in the "Key events" table.

        Args:
            vote_number:    Vote identifier (for the source record)
            procedure_ref:  OEIL-format procedure reference, e.g. "2025/0218(NLE)"
            vote_date:      Date of the vote (date or datetime object)

        Returns:
            Source dict with OEIL_SUMMARY type, or None if no summary found
        """
        from bs4 import BeautifulSoup

        # Normalize to date object
        if isinstance(vote_date, datetime):
            vote_date = vote_date.date()
        date_str = vote_date.strftime('%d/%m/%Y')   # format OEIL uses in the table

        url = f"{self.OEIL_HTML_BASE}?reference={procedure_ref}"

        try:
            response = self.http.get(
                url,
                headers={'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'},
            )
            response.raise_for_status()
        except Exception as e:
            self.log_warning(
                f"Failed to fetch OEIL procedure page for {procedure_ref}: {e}"
            )
            return None

        try:
            doc = BeautifulSoup(response.text, 'lxml')
        except Exception as e:
            self.log_warning(
                f"Failed to parse OEIL HTML for {procedure_ref}: {e}"
            )
            return None

        # ── Find the "Key events" section ────────────────────────────────────
        key_events_section = None
        for section in doc.select('.es_product-section'):
            heading = section.select_one('h2')
            if heading and 'Key events' in heading.get_text():
                key_events_section = section
                break

        if not key_events_section:
            self.log_warning(
                f"Could not find 'Key events' section for {procedure_ref}"
            )
            return None

        # ── Find row matching vote date + "Decision by Parliament" ────────────
        summary_id = None
        for row in key_events_section.select('tr'):
            cells_text = [td.get_text(strip=True) for td in row.select('td')]

            if date_str not in cells_text:
                continue
            if not any('Decision by Parliament' in c for c in cells_text):
                continue

            for link in row.select('a'):
                href = link.get('href', '')
                if 'document-summary?id=' not in href:
                    continue
                link_text = link.get_text(strip=True)
                if 'Summary' not in link_text:
                    continue
                match = re.search(r'document-summary\?id=(\d+)', href)
                if match:
                    summary_id = int(match.group(1))
                    break

            if summary_id:
                break

        if not summary_id:
            self.log_info(
                f"No summary link found for {procedure_ref} on {date_str}"
            )
            return None

        summary_url = f"{self.OEIL_SUMMARY_BASE}?id={summary_id}"
        self.log_info(
            f"Found summary {summary_id} for {procedure_ref} on {date_str}"
        )
        return {
            'vote_number': vote_number,
            'url':         summary_url,
            'name':        SOURCE_NAMES['OEIL_SUMMARY'],
            'source_type': 'OEIL_SUMMARY',
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Content fetch: Retrieve OEIL summary page text for AI processing
    # ─────────────────────────────────────────────────────────────────────────

    def fetch_oeil_summary_content(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Fetch and parse an OEIL document-summary page.

        Returns a dict with:
            {
                "title": str,
                "body": str,   # concatenated paragraph text
                "url": str,
            }
        or None on any failure (network, parse, or empty content).

        The caller is responsible for respecting rate limits — BaseScraper's
        http session adds a 2s delay between calls automatically.
        """
        from bs4 import BeautifulSoup

        try:
            response = self.http.get(
                url,
                headers={'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'},
                timeout=30,
            )
            response.raise_for_status()
        except Exception as e:
            self.log_warning(f"Failed to fetch OEIL summary page {url}: {e}")
            return None

        try:
            doc = BeautifulSoup(response.text, 'lxml')
        except Exception as e:
            self.log_warning(f"Failed to parse OEIL summary HTML {url}: {e}")
            return None

        # ── Extract title ─────────────────────────────────────────────────────
        title = ''
        title_tag = doc.select_one('h1') or doc.select_one('.ep-title')
        if title_tag:
            title = title_tag.get_text(separator=' ', strip=True)

        # ── Extract body text from paragraphs ─────────────────────────────────
        # OEIL summary pages use a .ep-generic-text or .ep_gridColumn main
        # content area. Collect all <p> tags within main content regions,
        # falling back to all <p> tags on the page if nothing specific found.
        paragraphs = []

        content_area = (
            doc.select_one('.ep-generic-text')
            or doc.select_one('.ep_gridColumn')
            or doc.select_one('main')
            or doc.select_one('article')
        )
        if content_area:
            for p in content_area.select('p'):
                text = p.get_text(separator=' ', strip=True)
                if text:
                    paragraphs.append(text)
            # Also collect any <ul><li> bullet points in the content area
            for li in content_area.select('li'):
                text = li.get_text(separator=' ', strip=True)
                if text:
                    paragraphs.append(text)
        else:
            for p in doc.select('p'):
                text = p.get_text(separator=' ', strip=True)
                if text:
                    paragraphs.append(text)

        body = '\n'.join(paragraphs)

        if not title and not body:
            self.log_warning(f"No content extracted from OEIL summary page {url}")
            return None

        self.log_info(
            f"Extracted OEIL summary: title={title[:60]!r} "
            f"body_chars={len(body)}"
        )
        return {
            'title': title,
            'body': body,
            'url': url,
        }

    @staticmethod
    def extract_procedure_ref_from_url(oeil_url: str) -> Optional[str]:
        """
        Extract the procedure reference from an OEIL procedure-file URL.

        "https://oeil.secure.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0045(COD)"
        → "2025/0045(COD)"
        """
        try:
            qs = parse_qs(urlparse(oeil_url).query)
            return qs.get('reference', [None])[0]
        except Exception:
            return None

    def fetch_oeil_summary_content(self, summary_url: str) -> Optional[str]:
        """
        Fetch the text content of an OEIL document-summary page.

        Args:
            summary_url: Full URL to the OEIL summary page,
                         e.g. "https://oeil.europarl.europa.eu/oeil/en/document-summary?id=12345"

        Returns:
            Extracted text content of the summary, or None on failure.
        """
        from bs4 import BeautifulSoup

        try:
            response = self.http.get(
                summary_url,
                headers={'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'},
                timeout=30,
            )
            response.raise_for_status()
        except Exception as e:
            self.log_warning(f"Failed to fetch OEIL summary {summary_url}: {e}")
            return None

        try:
            soup = BeautifulSoup(response.text, 'lxml')
        except Exception as e:
            self.log_warning(f"Failed to parse OEIL summary HTML: {e}")
            return None

        # The summary text lives in .es_product-content or similar main content area
        content_el = (
            soup.select_one('.es_product-content')
            or soup.select_one('article')
            or soup.select_one('main')
        )
        if not content_el:
            self.log_info(f"No content element found on summary page: {summary_url}")
            return None

        paragraphs = [p.get_text(strip=True) for p in content_el.select('p') if p.get_text(strip=True)]
        if not paragraphs:
            return None

        return '\n\n'.join(paragraphs)

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

    def _resolve_doc_id(
        self,
        document_reference: Optional[str],
        dec_label: Optional[str],
    ) -> Optional[str]:
        """
        Resolve the doceo doc_id for a REPORT source.

        Tries two sources in priority order:
          1. document_reference — already stored in doceo format by the votes
             scraper (e.g. "A-10-2025-0195"). Used directly as the doc_id.
          2. dec_label parsing — fallback when document_reference is NULL.
             Calls _extract_doc_ref() then _doc_ref_to_doc_id().

        Returns:
            doc_id string (e.g. "A-10-2025-0195"), or None if unresolvable.
        """
        # Priority 1: document_reference is already the correct doceo format
        if document_reference:
            return document_reference

        # Priority 2: parse from dec_label
        if dec_label:
            doc_ref = self._extract_doc_ref(dec_label)
            if doc_ref:
                return self._doc_ref_to_doc_id(doc_ref)

        return None

    def _extract_doc_ref(
        self,
        dec_label: str,
        rc_check_only: bool = False,
    ) -> Optional[str]:
        """
        Extract document reference from the start of a dec_label string.

        dec_label format:
          "A10-0244/2025 - Andrzej Buła - całość tekstu"
          "B10-0558/2025 - Agnieszka Pomaska, ... - całość tekstu"
          "RC-B10-0143/2026 - Projekt rezolucji (całość tekstu)"

        Args:
            dec_label:      Full DEC label string.
            rc_check_only:  If True, return the candidate only when it starts
                            with "RC-" (used to detect competing resolutions
                            that should be skipped). Returns None for non-RC
                            labels in this mode.

        Returns the first part before ' - ' if it looks like a doc ref
        (letters+digits+dash, then /year). Returns None for procedural labels
        like "Porządek dzienny" that have no document reference.
        """
        if not dec_label or ' - ' not in dec_label:
            return None

        candidate = dec_label.split(' - ')[0].strip()

        # Must start with capital letters and match doc ref pattern
        if re.match(r'^[A-Z][A-Z0-9\-]*\d{1,2}-\d+/\d{4}$', candidate):
            if rc_check_only:
                return candidate if candidate.startswith('RC-') else None
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
