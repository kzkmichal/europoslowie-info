"""Scraper for European Parliament voting results."""
import re
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional, Set
from datetime import datetime
from .base import BaseScraper


class VotesScraper(BaseScraper):
    """
    Scraper for voting results using EP Open Data API v2.

    This scraper collects:
    - Vote metadata (title, date, result, document references)
    - Individual MEP votes (FOR, AGAINST, ABSTAIN, ABSENT)
    - Vote breakdowns (total counts)

    Data flow (3-endpoint pipeline per session):
    1. /meetings/{id}/vote-results   → build vot_map: VOT-ITM-ID → clean title, doc ref, context_ai
    2. /meetings/{id}/decisions      → per DEC, link to VOT-ITM via inverse_consists_of
    3. /plenary-documents/{doc-id}   → optional enrichment for topic_category / policy_area

    Why 3 endpoints?
    - DEC level (decisions) contains voter lists but only ugly technical titles
      e.g. "A10-0195/2025 - Inese Vaidere - Wstępne porozumienie - Popr. 27"
    - VOT-ITM level (vote-results) contains the clean human-readable title
      e.g. "Stopniowe odchodzenie od importu gazu ziemnego z Rosji..."
    - DEC links back to its parent VOT-ITM via 'inverse_consists_of'
    """

    # European Parliament Open Data API
    API_BASE_URL = "https://data.europarl.europa.eu/api/v2"

    # Mapping of EP subject-matter codes → Polish category names
    SUBJECT_MATTER_MAP = {
        'ENER': 'Energia',
        'ENVI': 'Środowisko',
        'AGRI': 'Rolnictwo',
        'BUDG': 'Budżet',
        'ECON': 'Gospodarka',
        'EMPL': 'Zatrudnienie',
        'FORE': 'Sprawy zagraniczne',
        'JUST': 'Sprawiedliwość i praworządność',
        'TRAN': 'Transport',
        'HEAL': 'Zdrowie',
        'CULT': 'Kultura i edukacja',
        'AFET': 'Sprawy zagraniczne',
        'DEVE': 'Rozwój i współpraca',
        'INTA': 'Handel międzynarodowy',
        'LIBE': 'Wolności obywatelskie',
        'REGI': 'Polityka regionalna',
        'ITRE': 'Przemysł i badania',
        'JURI': 'Prawny',
        'PCOM': 'Petycje',
        'CONT': 'Kontrola budżetowa',
        'PECH': 'Rybołówstwo',
        'IMCO': 'Rynek wewnętrzny',
    }

    def __init__(self, enrich_documents: bool = False):
        """
        Initialize votes scraper.

        Args:
            enrich_documents: If True, fetch /plenary-documents/{doc-id} for each unique
                              document to get topic_category / policy_area.
                              Adds ~20-30 extra API calls per session but enriches data.
        """
        super().__init__(
            base_url=self.API_BASE_URL,
            rate_limit_seconds=2.0  # Conservative rate limiting (EP: 500 req / 5 min)
        )
        self.enrich_documents = enrich_documents

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
            # Step 1: Fetch VOT-ITM level data to build the title map
            self.log_info("Fetching vote-results for clean VOT-ITM title mapping...")
            vote_results = self._fetch_vote_results(meeting_id)
            vot_map = self._build_vot_map(vote_results)
            self.log_info(f"Built VOT-ITM map with {len(vot_map)} entries")

            # Step 1b (optional): Enrich with plenary document topic data
            doc_map: Dict[str, Dict] = {}
            if self.enrich_documents:
                self.log_info("Enriching with plenary document data...")
                doc_map = self._build_doc_map(vot_map)
                self.log_info(f"Enriched {len(doc_map)} unique documents")

            # Step 2: Fetch all decisions (contain voter lists)
            all_vote_records = []
            offset = 0
            limit = 100
            total_decisions = 0
            seen_decision_ids: Set[str] = set()

            while True:
                decisions_data = self._fetch_decisions(meeting_id, offset, limit)

                if not decisions_data:
                    break

                decisions = self._extract_decisions_list(decisions_data)

                if not decisions:
                    break

                # Detect pagination loop
                new_decisions = []
                for d in decisions:
                    d_id = d.get('@id') or d.get('id') or str(d)
                    if d_id not in seen_decision_ids:
                        seen_decision_ids.add(d_id)
                        new_decisions.append(d)

                if not new_decisions:
                    self.log_info("No new decisions in batch - pagination complete")
                    break

                self.log_info(
                    f"Processing batch: {len(new_decisions)} decisions "
                    f"(offset {offset})"
                )

                for decision in new_decisions:
                    vote_records = self._parse_decision(
                        decision,
                        meeting_id,
                        vot_map,
                        doc_map,
                        calculate_absent
                    )
                    all_vote_records.extend(vote_records)
                    total_decisions += 1

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

    # -------------------------------------------------------------------------
    # Step 1: VOT-ITM level — clean titles via /vote-results
    # -------------------------------------------------------------------------

    def _fetch_vote_results(self, meeting_id: str) -> List[Dict]:
        """
        Fetch VOT-ITM level data from /meetings/{id}/vote-results.

        Each item represents one voting topic (group of related DECs) and contains:
        - activity_label.pl: clean human-readable Polish title
        - based_on_a_realization_of: document ID (e.g. "eli/dl/doc/A-10-2025-0195")
        - structuredLabel.pl: XML with <title> and <label> (rapporteur, doc ref, majority type)
        - consists_of: list of child DEC IDs

        Returns:
            List of VOT-ITM objects, empty list on failure
        """
        url = f"{self.base_url}/meetings/{meeting_id}/vote-results"
        params = {
            'format': 'application/ld+json',
            'json-layout': 'framed',
        }

        try:
            response = self.http.get(url, params=params, timeout=90)

            if response.status_code == 404:
                self.log_warning(f"vote-results not found for {meeting_id} (404)")
                return []

            response.raise_for_status()
            data = response.json()
            return self._extract_decisions_list(data)

        except Exception as e:
            self.log_error(f"Failed to fetch vote-results for {meeting_id}: {e}")
            return []

    def _build_vot_map(self, vote_results: List[Dict]) -> Dict[str, Dict]:
        """
        Build mapping from VOT-ITM full URI to metadata.

        Key format: "eli/dl/event/MTG-PL-2025-12-17-VOT-ITM-978310"
        (matches the value in DEC's inverse_consists_of field)

        Returns dict structure:
        {
            "eli/dl/event/MTG-PL-2025-12-17-VOT-ITM-978310": {
                "title_pl": "Stopniowe odchodzenie od importu gazu ziemnego z Rosji...",
                "title_en": "Phasing out imports of Russian natural gas...",
                "doc_id":   "A-10-2025-0195",
                "context_ai": "Sprawozdanie: Inese Vaidere, Ville Niinistö (A10-0195/2025) (wymagana większość oddanych głosów)",
            },
            ...
        }
        """
        vot_map = {}

        for vot in vote_results:
            vot_id = vot.get('id', '')
            if not vot_id:
                continue

            # Get clean Polish/English titles, stripping reading markers (***I, ***II)
            label = vot.get('activity_label', {})
            title_pl = self._strip_reading_markers(
                label.get('pl', '') or label.get('mul', '') or ''
            )
            title_en = self._strip_reading_markers(label.get('en', '') or '')

            # Extract document ID from ELI URI: "eli/dl/doc/A-10-2025-0195" → "A-10-2025-0195"
            doc_refs = vot.get('based_on_a_realization_of', [])
            doc_id = None
            if doc_refs:
                first_ref = doc_refs[0]
                doc_uri = first_ref if isinstance(first_ref, str) else first_ref.get('id', '')
                doc_id = doc_uri.split('/')[-1] if doc_uri else None

            # Parse structuredLabel XML to get context_ai (the <label> element)
            structured_xml = vot.get('structuredLabel', {})
            if isinstance(structured_xml, dict):
                structured_xml = structured_xml.get('pl', '') or structured_xml.get('en', '') or ''
            context_ai = self._parse_structured_label(structured_xml)

            vot_map[vot_id] = {
                'title_pl': title_pl,
                'title_en': title_en,
                'doc_id': doc_id,
                'context_ai': context_ai,
            }

        return vot_map

    def _strip_reading_markers(self, title: str) -> str:
        """
        Strip EP legislative reading markers from the end of titles.

        Examples:
            "Stopniowe odchodzenie... ***I"   → "Stopniowe odchodzenie..."
            "Some title ***II"                → "Some title"
            "Some title ***"                  → "Some title"
        """
        return re.sub(r'\s+\*{3}[IVX]*$', '', title).strip()

    def _parse_structured_label(self, xml_str: str) -> Optional[str]:
        """
        Parse structuredLabel XML and return the <label> element as context_ai.

        The <label> element contains a concise human-readable summary like:
        "Sprawozdanie: Inese Vaidere, Ville Niinistö (A10-0195/2025) (wymagana większość oddanych głosów)"

        Args:
            xml_str: XML string like
                "<structuredLabel><title>...</title><label>...</label></structuredLabel>"

        Returns:
            Label text, or None if parsing fails / element missing
        """
        if not xml_str:
            return None
        try:
            root = ET.fromstring(xml_str)
            label_text = root.findtext('label', '').strip()
            return label_text or None
        except ET.ParseError:
            return None

    # -------------------------------------------------------------------------
    # Step 1b (optional): Document enrichment via /plenary-documents/{doc-id}
    # -------------------------------------------------------------------------

    def _fetch_plenary_document(self, doc_id: str) -> Optional[Dict]:
        """
        Fetch plenary document data for topic_category / policy_area enrichment.

        Endpoint: /plenary-documents/{doc_id}?language=pl

        Returns:
            Document object or None if not found / failed
        """
        url = f"{self.base_url}/plenary-documents/{doc_id}"
        params = {
            'language': 'pl',
            'format': 'application/ld+json',
        }

        try:
            response = self.http.get(url, params=params, timeout=30)

            if response.status_code == 404:
                self.log_warning(f"Plenary document not found: {doc_id}")
                return None

            response.raise_for_status()
            data = response.json()
            items = self._extract_decisions_list(data)
            return items[0] if items else None

        except Exception as e:
            self.log_warning(f"Failed to fetch plenary document {doc_id}: {e}")
            return None

    def _build_doc_map(self, vot_map: Dict[str, Dict]) -> Dict[str, Dict]:
        """
        Fetch plenary document data for all unique doc_ids in vot_map.

        Returns:
            Mapping doc_id → {topic_category, policy_area}
        """
        unique_docs = {v['doc_id'] for v in vot_map.values() if v.get('doc_id')}
        doc_map: Dict[str, Dict] = {}

        for doc_id in unique_docs:
            doc_data = self._fetch_plenary_document(doc_id)
            if doc_data:
                subjects = doc_data.get('isAboutSubjectMatter', [])
                topic_category = self._extract_topic_from_subject_matter(subjects)
                doc_map[doc_id] = {
                    'topic_category': topic_category,
                    'policy_area': None,  # Can be derived from procedure if needed
                }

        return doc_map

    def _extract_topic_from_subject_matter(self, subjects: List) -> Optional[str]:
        """
        Map EP subject-matter codes to Polish category names.
        Takes the first code that has a known mapping.

        Args:
            subjects: List of subject URIs or codes like ["ENER", "PCOM"] or
                     ["http://...def/ep-subject-matters/ENER", ...]

        Returns:
            Polish category name or None
        """
        for subject in subjects:
            code = subject.split('/')[-1] if isinstance(subject, str) else str(subject)
            if code in self.SUBJECT_MATTER_MAP:
                return self.SUBJECT_MATTER_MAP[code]
        return None

    # -------------------------------------------------------------------------
    # Step 2: DEC level — voter lists via /decisions
    # -------------------------------------------------------------------------

    def _fetch_decisions(
        self,
        meeting_id: str,
        offset: int = 0,
        limit: int = 100
    ) -> Optional[Dict]:
        """
        Fetch decisions (individual votes with voter lists) from a meeting.

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
            return response.json()

        except Exception as e:
            self.log_error(f"Failed to fetch decisions: {e}")
            return None

    def _extract_decisions_list(self, data: Dict) -> List[Dict]:
        """
        Extract decisions list from JSON-LD response.

        Handles different response structures:
        - {"data": [...]}  (most common)
        - {"@graph": [...]}
        - [...]  (bare array)
        - {...}  (single object)
        """
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
        vot_map: Dict[str, Dict],
        doc_map: Dict[str, Dict],
        calculate_absent: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Parse a single DEC decision and create per-MEP vote records.

        Title resolution strategy:
        1. Follow inverse_consists_of → parent VOT-ITM ID
        2. Look up clean title in vot_map
        3. Fallback to DEC-level activity_label if VOT-ITM not found

        Args:
            decision: DEC decision JSON object
            meeting_id: Meeting identifier
            vot_map: VOT-ITM URI → metadata mapping (from _build_vot_map)
            doc_map: doc_id → topic data mapping (from _build_doc_map, may be empty)
            calculate_absent: Whether to calculate ABSENT votes

        Returns:
            List of vote records (one per MEP who voted FOR/AGAINST/ABSTAIN)
        """
        try:
            vote_id = decision.get('notation_votingId', 'N/A')

            # --- Resolve clean title via VOT-ITM parent ---
            inverse = decision.get('inverse_consists_of', [])
            vot_uri = None
            if inverse:
                first = inverse[0]
                vot_uri = first if isinstance(first, str) else first.get('id', '')

            vot_data = vot_map.get(vot_uri, {}) if vot_uri else {}

            if vot_data.get('title_pl'):
                # ✅ Use clean VOT-ITM title
                title_pl = vot_data['title_pl']
                title_en = vot_data.get('title_en', '') or ''
            else:
                # Fallback: DEC-level title (ugly, but better than nothing)
                activity_label = decision.get('activity_label', {})
                title_pl = self._strip_reading_markers(activity_label.get('pl', ''))
                title_en = self._strip_reading_markers(activity_label.get('en', ''))
                if not title_pl and title_en:
                    title_pl = title_en

            # --- Enrich fields from VOT-ITM data ---
            doc_id = vot_data.get('doc_id')
            document_reference = doc_id  # e.g. "A-10-2025-0195"
            context_ai = vot_data.get('context_ai')  # from structuredLabel <label>

            # topic_category from optional plenary document enrichment
            topic_category = None
            if doc_id and doc_id in doc_map:
                topic_category = doc_map[doc_id].get('topic_category')

            # --- Standard DEC fields ---
            date_str = decision.get('activity_date', '')

            outcome_uri = decision.get('decision_outcome', '')
            outcome = self._normalize_result(
                outcome_uri.split('/')[-1] if outcome_uri else ''
            )

            votes_for = decision.get('number_of_votes_favor', 0)
            votes_against = decision.get('number_of_votes_against', 0)
            votes_abstain = decision.get('number_of_votes_abstention', 0)

            # Only ROLLCALL votes have individual MEP votes
            decision_method = decision.get('decision_method', '')
            is_rollcall = 'ROLLCALL' in decision_method.upper()

            if not is_rollcall:
                self.log_info(
                    f"Skipping vote {vote_id} - not a roll-call vote "
                    f"(method: {decision_method})"
                )
                return []

            # --- Extract voter lists ---
            voters_for = decision.get('had_voter_favor', [])
            voters_against = decision.get('had_voter_against', [])
            voters_abstain = decision.get('had_voter_abstention', [])

            person_ids_for = [self._extract_person_id(v) for v in voters_for]
            person_ids_against = [self._extract_person_id(v) for v in voters_against]
            person_ids_abstain = [self._extract_person_id(v) for v in voters_abstain]

            # --- Detect is_main and extract dec_label from DEC activity_label ---
            dec_label_raw = decision.get('activity_label', {})
            dec_label_pl = dec_label_raw.get('pl', '')
            dec_label_en = dec_label_raw.get('en', '')
            is_main = self._is_main_vote(dec_label_pl, dec_label_en)
            dec_label = self._extract_dec_label(dec_label_pl or dec_label_en)

            # --- Build per-MEP vote records ---
            common_data = {
                'vote_number': str(vote_id),
                'title': title_pl[:500] if title_pl else 'N/A',
                'title_en': title_en[:500] if title_en else None,
                'date': date_str,
                'result': outcome,
                'votes_for': votes_for,
                'votes_against': votes_against,
                'votes_abstain': votes_abstain,
                'document_reference': document_reference,
                'context_ai': context_ai,
                'topic_category': topic_category,
                'is_main': is_main,
                'dec_label': dec_label,
                'meeting_id': meeting_id,
            }

            vote_records = []

            for person_id in person_ids_for:
                vote_records.append({
                    **common_data,
                    'person_id': person_id,
                    'vote_choice': 'FOR'
                })

            for person_id in person_ids_against:
                vote_records.append({
                    **common_data,
                    'person_id': person_id,
                    'vote_choice': 'AGAINST'
                })

            for person_id in person_ids_abstain:
                vote_records.append({
                    **common_data,
                    'person_id': person_id,
                    'vote_choice': 'ABSTAIN'
                })

            # Note: ABSENT calculation done in data loading phase
            # (requires full MEP list, not available here)

            self.stats['items_scraped'] += len(vote_records)
            return vote_records

        except Exception as e:
            self.log_warning(f"Failed to parse decision: {e}")
            return []

    def _extract_dec_label(self, activity_label: str) -> str:
        """
        Extract the meaningful subject label from a DEC activity_label,
        stripping the leading "DOCREF - RAPPORTEUR - " prefix.

        DEC activity_label format:
          "A10-0244/2025 - Andrzej Buła - ust. 7/2"
          "A10-0195/2025 - Inese Vaidere, Ville Niinistö - Wstępne porozumienie - Popr. 27"

        Returns:
          "ust. 7/2"
          "Wstępne porozumienie - Popr. 27"
          (original string if format doesn't match)
        """
        if not activity_label:
            return ''
        # Split on first two " - " separators: [DOCREF, RAPPORTEUR(S), SUBJECT...]
        parts = activity_label.split(' - ', 2)
        if len(parts) == 3 and re.match(r'^[A-Z]\d+-\d+/\d{4}', parts[0]):
            return parts[2].strip()
        return activity_label.strip()

    def _is_main_vote(self, dec_label_pl: str, dec_label_en: str = '') -> bool:
        """
        Detect whether this DEC is the "main" vote for a topic (equivalent to
        HowTheyVote's is_main=True), as opposed to a sub-vote on a specific
        amendment, recital, or paragraph.

        Main vote markers in activity_label.pl:
          - "całość tekstu"        → final vote on the whole resolution text
          - "Wstępne porozumienie" → provisional legislative agreement
          - "Wniosek o odrzucenie" → proposal to reject (key procedural vote)

        Sub-vote markers (NOT main):
          - "Motyw "               → vote on a specific recital (e.g. "Motyw E")
          - "motywie "             → recital insertion (e.g. "Po motywie B")
          - " ust. "               → vote on a specific paragraph
          - "pkt "                 → vote on a specific point
          - " art. "               → vote on a specific article
          - "Załącznik"            → vote on an annex (e.g. "Załącznik, akapit pierwszy/2")
          - "Zalecenie "           → recommendation section (e.g. "Zalecenie nr 3, akapit trzeci/2")
          - "akapit "              → paragraph in annex/recommendation (e.g. "akapit pierwszy/2")

        Edge case: "Wstępne porozumienie - Popr. 27" has "Popr." but IS main.
        Edge case: "Wniosek o odrzucenie - Popr. 2" has "Popr." but IS main.
        So we check main markers first before sub-vote markers.
        """
        label = dec_label_pl or dec_label_en

        MAIN_MARKERS = [
            'całość tekstu',        # final vote on whole resolution text
            'Wstępne porozumienie', # provisional agreement (legislative)
            'Wniosek o odrzucenie', # proposal to reject
            'whole text',           # EN fallback
            'Provisional agreement',
            'Proposal to reject',
        ]
        SUB_MARKERS = [
            'Motyw ',       # recital vote: "Motyw E", "Motyw J/1"
            'motywie ',     # recital insertion: "Po motywie B", "Po motywie P"
            ' ust. ',       # paragraph vote: "- ust. 2/2", "- ust. 7"
            'pkt ',         # point vote
            ' art. ',       # article vote
            'Załącznik',    # annex vote: "Załącznik, akapit pierwszy/2"
            'Zalecenie ',   # recommendation section: "Zalecenie nr 3, akapit trzeci/2"
            'akapit ',      # paragraph within annex/recommendation: "akapit pierwszy/2"
        ]

        # Check main markers first (they override sub-vote markers)
        if any(m in label for m in MAIN_MARKERS):
            return True

        # Check explicit sub-vote markers
        if any(m in label for m in SUB_MARKERS):
            return False

        # Default: treat as main if no sub-vote markers found
        # (covers simple resolution votes, procedural votes, agenda votes etc.)
        return True

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------

    def _extract_person_id(self, person_uri: str) -> int:
        """
        Extract numeric EP person ID from URI.

        Args:
            person_uri: e.g. 'person/197498'

        Returns:
            Numeric EP ID (197498), or 0 if parsing fails
        """
        try:
            return int(person_uri.split('/')[-1])
        except (ValueError, IndexError, AttributeError):
            return 0

    def _normalize_result(self, result: str) -> str:
        """
        Normalize vote result to consistent values.

        Returns:
            'ADOPTED', 'REJECTED', or 'UNKNOWN'
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
    from dotenv import load_dotenv

    load_dotenv()

    # Basic usage (no document enrichment)
    with VotesScraper() as scraper:
        meeting_id = "MTG-PL-2025-12-17"
        votes = scraper.scrape(meeting_id=meeting_id)
        valid_votes = scraper.validate(votes)
        scraper.print_summary()

        if valid_votes:
            print(f"\nTotal vote records: {len(valid_votes)}")
            print("\nSample vote record:")
            import json
            print(json.dumps(valid_votes[0], default=str, ensure_ascii=False, indent=2))

            # Group by vote number to see unique votes
            unique_votes: Dict[str, Dict] = {}
            for vote in valid_votes:
                vote_num = vote['vote_number']
                if vote_num not in unique_votes:
                    unique_votes[vote_num] = {
                        'title': vote['title'],
                        'result': vote['result'],
                        'document_reference': vote.get('document_reference'),
                        'context_ai': vote.get('context_ai'),
                        'choices': {'FOR': 0, 'AGAINST': 0, 'ABSTAIN': 0}
                    }
                choice = vote['vote_choice']
                if choice in unique_votes[vote_num]['choices']:
                    unique_votes[vote_num]['choices'][choice] += 1

            print(f"\nUnique votes found: {len(unique_votes)}")
            for vote_num, info in list(unique_votes.items())[:5]:
                print(f"\n  {vote_num}: {info['title'][:80]}...")
                print(f"  Result: {info['result']}")
                print(f"  Doc ref: {info['document_reference']}")
                print(f"  Context: {(info['context_ai'] or '')[:80]}")
                print(f"  Votes: FOR={info['choices']['FOR']}, "
                      f"AGAINST={info['choices']['AGAINST']}, "
                      f"ABSTAIN={info['choices']['ABSTAIN']}")
