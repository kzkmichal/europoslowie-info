"""Scraper for MEP committee memberships using EP Open Data API v2."""
from typing import Any, Dict, List, Optional

from .base import BaseScraper

EP_API_BASE = 'https://data.europarl.europa.eu/api/v2'

# Committee classifications that count as "parliamentary committee"
COMMITTEE_CLASSIFICATIONS = {
    'def/ep-entities/COMMITTEE_PARLIAMENTARY_STANDING',
    'def/ep-entities/COMMITTEE_PARLIAMENTARY_SPECIAL',
    'def/ep-entities/COMMITTEE_PARLIAMENTARY_TEMPORARY',
    'def/ep-entities/COMMITTEE_PARLIAMENTARY_CONCILIATION',
    'def/ep-entities/COMMITTEE_PARLIAMENTARY_INQUIRY',
}

# EP parliamentary committee codes → Polish names
COMMITTEE_NAMES: Dict[str, str] = {
    'AFET': 'Sprawy zagraniczne',
    'DROI': 'Prawa człowieka',
    'SEDE': 'Bezpieczeństwo i obrona',
    'DEVE': 'Rozwój',
    'INTA': 'Handel międzynarodowy',
    'BUDG': 'Budżet',
    'CONT': 'Kontrola budżetowa',
    'ECON': 'Gospodarka i waluta',
    'FISC': 'Sprawy podatkowe',
    'EMPL': 'Zatrudnienie i sprawy socjalne',
    'ENVI': 'Środowisko, zdrowie publiczne i bezpieczeństwo żywności',
    'ITRE': 'Przemysł, badania naukowe i energia',
    'IMCO': 'Rynek wewnętrzny i ochrona konsumentów',
    'TRAN': 'Transport i turystyka',
    'REGI': 'Rozwój regionalny',
    'AGRI': 'Rolnictwo i rozwój wsi',
    'PECH': 'Rybołówstwo',
    'CULT': 'Kultura i edukacja',
    'JURI': 'Prawna',
    'LIBE': 'Wolności obywatelskie, sprawiedliwość i sprawy wewnętrzne',
    'AFCO': 'Sprawy konstytucyjne',
    'FEMM': 'Prawa kobiet i równouprawnienie płci',
    'PETI': 'Petycje',
    'AIBE': 'Sztuczna inteligencja w epoce cyfrowej',
    'CLIM': 'Zmiana klimatu i energia',
    'BUDE': 'Budżetowy',
    'COVI': 'COVID-19',
    'INGE': 'Ingerencja zagraniczna',
}

# Role URI suffix → normalized role string
ROLE_MAP: Dict[str, str] = {
    'MEMBER': 'member',
    'MEMBER_SUBSTITUTE': 'substitute',
    'SUBSTITUTE': 'substitute',
    'CHAIR': 'chair',
    'VICE_CHAIR': 'vice-chair',
    'CO_CHAIR': 'chair',
    'OBSERVER': 'member',
    'HONORARY_PRESIDENT': 'member',
    'QUAESTOR': 'member',
}


def _extract_org_numeric_id(org_uri: str) -> Optional[str]:
    """Extract numeric org ID from 'org/5085' → '5085'."""
    if not org_uri:
        return None
    parts = org_uri.rstrip('/').split('/')
    numeric = parts[-1]
    return numeric if numeric.isdigit() else None


def _normalize_role(role_uri: str) -> str:
    """Map a role URI to a normalized string."""
    suffix = role_uri.rstrip('/').split('/')[-1].split('#')[-1].upper()
    return ROLE_MAP.get(suffix, 'member')


class CommitteesScraper(BaseScraper):
    """
    Fetches parliamentary committee memberships for Polish MEPs.

    For each MEP, calls GET /api/v2/meps/{ep_id}?format=application/ld+json
    and extracts hasMembership entries where membershipClassification is one of
    the COMMITTEE_PARLIAMENTARY_* types.

    Committee codes are resolved via GET /api/v2/corporate-bodies/{numeric_id}
    with an in-memory cache to avoid redundant API calls.
    """

    def __init__(self):
        super().__init__(base_url=EP_API_BASE, rate_limit_seconds=2.0)
        self._org_code_cache: Dict[str, Optional[str]] = {}

    def scrape(self, mep_ep_ids: List[int]) -> List[Dict[str, Any]]:
        """
        Scrape committee memberships for every MEP in mep_ep_ids.

        Returns:
            List of membership dicts ready for upsert.
        """
        self.log_info(f"Starting committee membership scrape for {len(mep_ep_ids)} MEPs")
        all_memberships: List[Dict[str, Any]] = []

        for ep_id in mep_ep_ids:
            memberships = self._scrape_for_mep(ep_id)
            all_memberships.extend(memberships)
            self.stats['items_scraped'] += len(memberships)
            self.log_info(f"  MEP {ep_id}: {len(memberships)} committee memberships")

        return all_memberships

    def _scrape_for_mep(self, ep_id: int) -> List[Dict[str, Any]]:
        """Fetch and parse committee memberships for a single MEP."""
        url = f"{EP_API_BASE}/meps/{ep_id}"
        try:
            response = self.http.get(url, params={'format': 'application/ld+json'})
            data = response.json()
        except Exception as e:
            self.log_error(f"Failed to fetch MEP {ep_id}: {e}")
            return []

        items = data.get('data', [])
        if not items:
            return []

        detail = items[0]
        memberships_raw = detail.get('hasMembership', [])
        results = []

        for m in memberships_raw:
            classification = m.get('membershipClassification', '')
            if classification not in COMMITTEE_CLASSIFICATIONS:
                continue

            org_uri = m.get('organization', '')
            org_num_id = _extract_org_numeric_id(org_uri)
            if not org_num_id:
                continue

            code = self._resolve_committee_code(org_num_id)
            if not code:
                continue

            role_uri = m.get('role', '')
            role = _normalize_role(role_uri)

            member_during = m.get('memberDuring', {}) or {}
            from_date = member_during.get('startDate') or '2024-07-16'
            to_date = member_during.get('endDate')
            is_current = not bool(to_date)

            committee_name = COMMITTEE_NAMES.get(code, code)

            results.append({
                'mep_ep_id': ep_id,
                'committee_name': committee_name,
                'committee_code': code,
                'role': role,
                'from_date': from_date,
                'to_date': to_date,
                'is_current': is_current,
            })

        return results

    def _resolve_committee_code(self, org_num_id: str) -> Optional[str]:
        """
        Resolve a numeric org ID to a committee code (e.g. '5085' → 'CONT').
        Uses in-memory cache. Makes one API call per unique org ID.
        """
        if org_num_id in self._org_code_cache:
            return self._org_code_cache[org_num_id]

        url = f"{EP_API_BASE}/corporate-bodies/{org_num_id}"
        try:
            response = self.http.get(url, params={'format': 'application/ld+json'})
            data = response.json()
            items = data.get('data', [])
            if items:
                code = items[0].get('label')
                self._org_code_cache[org_num_id] = code
                return code
        except Exception as e:
            self.log_warning(f"Failed to resolve org {org_num_id}: {e}")

        self._org_code_cache[org_num_id] = None
        return None

    def validate(self, data: List[Dict]) -> List[Dict]:
        """Filter out records missing required fields."""
        required = {'mep_ep_id', 'committee_code', 'role', 'from_date'}
        valid = []
        for item in data:
            missing = required - {k for k, v in item.items() if v is not None and v != ''}
            if missing:
                self.log_warning(
                    f"Skipping committee entry for MEP {item.get('mep_ep_id')}: missing {missing}"
                )
                self.stats['items_invalid'] += 1
            else:
                valid.append(item)
                self.stats['items_valid'] += 1
        return valid
