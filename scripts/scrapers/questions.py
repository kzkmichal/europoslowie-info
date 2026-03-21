"""Parliamentary questions scraper using EP Open Data API v2."""
from typing import Any, Dict, List, Optional, Set

from .base import BaseScraper

EP_API_BASE = 'https://data.europarl.europa.eu/api/v2'
JSON_LD = 'application%2Fld%2Bjson'

# Maps EP organisation short codes to Polish display names
INSTITUTION_NAMES = {
    'COM': 'Komisja Europejska',
    'EU_COUNCIL': 'Rada UE',
    'COUNCIL': 'Rada UE',
    'VP': 'Wiceprzewodniczący/WP',
    'EUCO': 'Rada Europejska',
}


class QuestionsScraper(BaseScraper):
    """
    Scrapes written parliamentary questions submitted by Polish MEPs.

    Two-phase strategy (the list endpoint has no per-MEP filter):
      Phase 1 — collect all question IDs for each requested year.
      Phase 2 — fetch details for every ID and keep only those authored by
                a Polish MEP (i.e. whose ep_id is in mep_ep_ids).
    """

    def __init__(self):
        super().__init__(base_url=EP_API_BASE, rate_limit_seconds=2.0)

    def scrape(self, mep_ep_ids: Set[int], years: List[int]) -> List[Dict[str, Any]]:
        """
        Scrape written questions for the given years, filtered to Polish MEPs.

        Args:
            mep_ep_ids: Set of EP numeric IDs for all active Polish MEPs.
            years: List of calendar years to scrape.

        Returns:
            List of question dicts ready for upsert.
        """
        self.log_info(
            f"Starting questions scrape for years={years}, "
            f"tracking {len(mep_ep_ids)} Polish MEPs"
        )

        all_questions = []

        for year in years:
            self.log_info(f"Phase 1 — collecting question IDs for {year}…")
            ids = self._collect_ids_for_year(year)
            self.log_info(f"  Found {len(ids)} questions in {year}")

            self.log_info(f"Phase 2 — fetching details for {year}…")
            count = 0
            for qid in ids:
                question = self._fetch_question(qid, mep_ep_ids)
                if question:
                    all_questions.append(question)
                    count += 1
                self.stats['items_scraped'] += 1

            self.log_info(f"  {count} questions kept for Polish MEPs in {year}")

        return all_questions

    def _collect_ids_for_year(self, year: int) -> List[str]:
        """Paginate through the list endpoint and return all question identifiers."""
        ids = []
        offset = 0
        limit = 50
        url = f"{EP_API_BASE}/parliamentary-questions"

        while True:
            try:
                response = self.http.get(url, params={
                    'year': year,
                    'work-type': 'QUESTION_WRITTEN',
                    'format': 'application/ld+json',
                    'limit': limit,
                    'offset': offset,
                })
                data = response.json()
            except Exception as e:
                self.log_error(
                    f"Failed to fetch question IDs for {year} offset={offset}: {e}"
                )
                break

            items = data.get('data', [])
            if not items:
                break

            for item in items:
                identifier = item.get('identifier')
                if identifier:
                    ids.append(identifier)

            if len(items) < limit:
                break

            offset += limit

        return ids

    def _fetch_question(
        self, qid: str, mep_ep_ids: Set[int]
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch a single question's details. Return a dict if the creator is a
        Polish MEP, otherwise None.
        """
        url = f"{EP_API_BASE}/parliamentary-questions/{qid}"
        try:
            response = self.http.get(url, params={'format': 'application/ld+json'})
            data = response.json()
        except Exception as e:
            self.log_error(f"Failed to fetch question {qid}: {e}")
            return None

        items = data.get('data', [])
        if not items:
            return None

        item = items[0]

        # Resolve creator → first Polish MEP ep_id found among all co-authors
        creators = item.get('creator', [])
        mep_ep_id = None
        for creator in creators:
            # creator is a string like "person/197694"
            creator_ref = creator if isinstance(creator, str) else creator.get('@id', '')
            if creator_ref.startswith('person/'):
                try:
                    candidate = int(creator_ref.split('/')[1])
                except (ValueError, IndexError):
                    continue
                if candidate in mep_ep_ids:
                    mep_ep_id = candidate
                    break  # use first Polish MEP found

        if mep_ep_id is None:
            return None

        # Resolve addressed_to
        addressed_to = self._resolve_addressed_to(item)

        # Resolve question text (title of realizing document)
        question_text = self._resolve_question_text(item)
        if not question_text:
            question_text = item.get('label', {}).get('en', '') or qid

        # Dates
        date_submitted = item.get('document_date') or item.get('date')

        # Answer info
        date_answered = None
        answered_by = None
        answers = item.get('inverse_answers_to', [])
        if answers:
            first_answer = answers[0] if isinstance(answers[0], dict) else {}
            date_answered = first_answer.get('document_date')
            answer_creators = first_answer.get('creator', [])
            if answer_creators:
                ac = answer_creators[0]
                ac_ref = ac if isinstance(ac, str) else ac.get('@id', '')
                # strip "org/" prefix and look up display name
                org_code = ac_ref.replace('org/', '')
                answered_by = INSTITUTION_NAMES.get(org_code, org_code)

        return {
            'mep_ep_id': mep_ep_id,
            'question_number': item.get('identifier', qid),
            'subject': question_text,
            'question_text': question_text,
            'addressed_to': addressed_to,
            'date_submitted': date_submitted,
            'date_answered': date_answered,
            'answered_by': answered_by,
        }

    def _resolve_addressed_to(self, item: dict) -> str:
        """Extract and map the addressee institution code to a display name."""
        participations = item.get('workHadParticipation', [])
        for p in participations:
            role = p.get('participation_role', '')
            if 'ADDRESSEE' in role:
                org_list = p.get('had_participant_organization', [])
                # had_participant_organization is a list of strings like ["org/COM"]
                if isinstance(org_list, list) and org_list:
                    org_ref = org_list[0]
                else:
                    org_ref = str(org_list)
                org_code = str(org_ref).replace('org/', '')
                return INSTITUTION_NAMES.get(org_code, org_code) or 'Nieznana instytucja'
        return 'Nieznana instytucja'

    def _resolve_question_text(self, item: dict) -> Optional[str]:
        """
        Extract the question title from realizing documents.
        Prefers Polish, then English, then any other language.
        """
        realized_by = item.get('is_realized_by', [])
        # Collect all titles keyed by language
        titles: dict = {}
        for doc in realized_by:
            if isinstance(doc, dict):
                title = doc.get('title', {})
                if isinstance(title, dict):
                    titles.update(title)
                elif isinstance(title, str) and title:
                    return title
        if not titles:
            return None
        return titles.get('pl') or titles.get('en') or next(iter(titles.values()), None)

    def validate(self, data: List[Dict]) -> List[Dict]:
        """Filter out records missing required fields."""
        required = {'question_number', 'subject', 'question_text', 'addressed_to', 'date_submitted', 'mep_ep_id'}
        valid = []
        for item in data:
            missing = required - set(k for k, v in item.items() if v is not None and v != '')
            if missing:
                self.log_warning(f"Skipping question {item.get('question_number')}: missing {missing}")
                self.stats['items_invalid'] += 1
            else:
                valid.append(item)
                self.stats['items_valid'] += 1

        return valid
