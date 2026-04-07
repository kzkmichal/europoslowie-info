#!/usr/bin/env python3
"""
Populate vote_items.poland_score and vote_items.poland_relevance_data
with AI-generated Poland relevance scoring.

For each representative vote without a poland_score:
  1. Run pre-filter pipeline (procedural keywords, auto-kluczowe, sensitive topics)
  2. If not auto-classified, call Claude Haiku 4.5 with appropriate prompt (A or B)
  3. Store score (int 0-100) and relevance JSON in vote_items

Output JSON stored in poland_relevance_data:
    {
        "relevance": "kluczowe" | "istotne" | "neutralne",
        "score": 85,
        "reasoning": "2-3 zdania po polsku...",
        "key_factors": ["czynnik 1", "czynnik 2"],
        "low_confidence": false,
        "is_sensitive": false,
        "auto_classified": false,
        "model": "claude-haiku-4-5-20251001",
        "generated_at": "2026-04-07T..."
    }

Usage:
    python scripts/populate_poland_relevance.py               # all eligible
    python scripts/populate_poland_relevance.py --vote-number 184110
    python scripts/populate_poland_relevance.py --from-date 2026-01-01
    python scripts/populate_poland_relevance.py --limit 10 --dry-run
    python scripts/populate_poland_relevance.py --force
"""

import json
import os
import re
import sys
import argparse
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.utils.logger import setup_logger

logger = setup_logger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Pre-filter tag lists
# ─────────────────────────────────────────────────────────────────────────────

PROCEDURAL_KEYWORDS = [
    "porządek obrad",
    "preliminarz dochodów i wydatków",
    "powołanie, kompetencje, skład",
    "długość kadencji komisji",
    "prace komisji petycji",
    "działalność komisji petycji",
]

AUTO_KLUCZOWE = [
    "krajowy plan odbudowy",
    "kpo",
    "import ukraińskiego zboża",
    "cła na zboże z ukrainy",
    "embargo na produkty rolne z ukrainy",
    "mercosur",
]

SENSITIVE_TOPICS = [
    "praworządność",
    "niezależność sądownicza",
    "prawa reprodukcyjne",
    "aborcja",
    "prawa lgbt",
    "orientacja seksualna",
    "tożsamość płciowa",
    "wolność mediów",
    "media publiczne",
    "relokacja migrantów",
    "relokacja uchodźców",
    "mniejszości narodowe",
    "mniejszości religijne",
]

HINT_KLUCZOWE = [
    "ukraina", "ukrainy", "ukraińsk",
    "rosja", "rosyjsk", "rosyjskiej",
    "białoruś", "białoruskiej",
    "sankcje wobec rosji",
    "flota cieni",
    "program safe",
    "rearm europe",
    "europejski fundusz obronny",
    "obronność europejska",
    "cła usa", "taryfy usa",
    "stosunki handlowe z usa",
    "transatlantyckie",
    "węgiel", "górnictwo", "kopalnie",
    "transformacja energetyczna",
    "sprawiedliwa transformacja",
    "handel emisjami", "uprawnienia do emisji",
    "ets",
    "pakt dla czystego przemysłu",
    "energia jądrowa",
    "gaz ziemny", "lng",
    "stal", "hutnictwo",
    "cement",
    "przemysł ciężki",
    "polityka spójności", "fundusz spójności",
    "fundusz na rzecz sprawiedliwej transformacji",
    "europejski fundusz rozwoju regionalnego",
    "wspólna polityka rolna",
    "rolnicy", "sektor rolny",
    "dopłaty bezpośrednie",
]

HINT_ISTOTNE = [
    "stany zjednoczone",
    "umowa handlowa", "umowa o partnerstwie",
    "cła", "bariery celne",
    "rynek pracy", "pracownicy",
    "płaca minimalna", "minimalne wynagrodzenie",
    "ubóstwo energetyczne",
    "łańcuch podwykonawców",
    "renowacja budynków", "dyrektywa budynkowa", "epbd",
    "elektromobilność", "samochody elektryczne",
    "polityka bezpieczeństwa",
    "nato",
    "sztuczna inteligencja", "ai act",
    "digitalizacja", "cyfryzacja",
    "ochrona danych",
    "rolnictwo",
    "wylesianie",
    "pestycydy",
    "bioróżnorodność",
]

# ─────────────────────────────────────────────────────────────────────────────
# AI prompts
# ─────────────────────────────────────────────────────────────────────────────

POLAND_PROFILE = """
PROFIL POLSKI — fakty które masz znać przy każdej ocenie:

Energia i klimat:
- Polska pokrywa ~65% energii elektrycznej z węgla — największy producent węgla
  w UE (~55 mln ton/rok). Każda regulacja klimatyczna (ETS, Fit for 55, normy
  emisji) ma dla Polski większy koszt niż dla większości krajów UE.
- Polska buduje pierwszą elektrownię jądrową i dywersyfikuje gaz
  (Baltic Pipe, terminale LNG) po odcięciu od Rosji.

Fundusze UE:
- Polska jest największym beneficjentem netto UE: ~€18 mld/rok z polityki
  spójności, ~€8 mld/rok z CAP, €35,4 mld z KPO (uzależnione od reform).
- Każda zmiana zasad dystrybucji funduszy lub warunkowości uderza w Polskę.

Rolnictwo:
- 4. sektor rolny w UE. Polska jest głównym krajem tranzytowym ukraińskiego
  zboża po 2022 roku — co wywołało kryzys cenowy dla polskich rolników.
- Regulacje CAP, pestycydów, GMO i umowy handlowe z krajami spoza UE
  (Mercosur, Ukraina) bezpośrednio dotykają polskiego rolnictwa.

Bezpieczeństwo i polityka wschodnia:
- Polska ma najdłuższą granicę z Ukrainą (535 km), Białorusią (418 km)
  i Rosją/Kaliningradem (210 km) spośród krajów UE.
- Wydaje 4% PKB na obronność (najwyżej w NATO/UE). Wsparcie dla Ukrainy
  i sankcje na Rosję to priorytet polskiej polityki zagranicznej.
- Granica z Białorusią jest punktem instrumentalizacji migracji.

Przemysł i handel:
- Znaczący producent stali, cementu, wyrobów chemicznych — sektory silnie
  objęte ETS. Polski przemysł motoryzacyjny (Tier 1/2) zależy od tempa
  elektryfikacji w UE.
- USA są ważnym partnerem handlowym i militarnym — cła USA na towary
  europejskie uderzają w polski eksport.
"""

PROMPT_A_SYSTEM = f"""Jesteś analitykiem polityki europejskiej specjalizującym się w Polsce.

To głosowanie zostało wstępnie zakwalifikowane jako istotne dla Polski
na podstawie jego tematu. Twoim zadaniem jest ocena STOPNIA istotności
i opisanie konkretnych skutków dla Polski.

{POLAND_PROFILE}

JAK OCENIAĆ:
Nie pytaj "czy tytuł wspomina Polskę". Pytaj: "jakie konkretne skutki —
prawne, finansowe, gospodarcze, bezpieczeństwa — ma to głosowanie dla Polski
biorąc pod uwagę jej profil?"

KATEGORIE:
🔴 KLUCZOWE (score 70-100): głosowanie nakłada na Polskę konkretne zobowiązania,
   zmienia przepływ środków finansowych, dotyczy bezpieczeństwa wschodniej flanki,
   reguluje sektory gdzie Polska jest dominującym lub silnie uzależnionym graczem.

🟡 ISTOTNE (score 40-69): ogólnounijne regulacje z ponadprzeciętnym skutkiem
   dla Polski ze względu na jej strukturę gospodarczą lub geopolityczną pozycję.
   Polska jest jednym z głównie dotkniętych krajów, choć nie jedynym.

FORMAT ODPOWIEDZI (tylko JSON, nic poza JSON):
{{
  "relevance": "kluczowe" | "istotne",
  "score": 40-100,
  "reasoning": "2-3 zdania po polsku — konkretne skutki dla Polski",
  "key_factors": ["czynnik 1", "czynnik 2"],
  "low_confidence": true | false
}}
low_confidence = true gdy masz tylko tytuł bez opisu głosowania.

PRZYKŁAD:
Tytuł: "System handlu uprawnieniami do emisji — rewizja dla instalacji przemysłowych"
Tagi: ["ets", "węgiel"]
Odpowiedź: {{
  "relevance": "kluczowe", "score": 82,
  "reasoning": "Polska jest największym producentem węgla i stali w UE — obie gałęzie bezpośrednio objęte ETS. Wyższe ceny uprawnień CO2 oznaczają wyższe koszty produkcji dla polskiego przemysłu niż dla krajów z niskim udziałem energetyki węglowej.",
  "key_factors": ["ETS", "przemysł ciężki", "węgiel"],
  "low_confidence": false
}}"""

PROMPT_B_SYSTEM = f"""Jesteś analitykiem polityki europejskiej specjalizującym się w Polsce.

{POLAND_PROFILE}

JAK OCENIAĆ:
Nie pytaj "czy tytuł wspomina Polskę". Pytaj: "jakie konkretne skutki —
prawne, finansowe, gospodarcze, bezpieczeństwa — ma to głosowanie dla Polski
biorąc pod uwagę jej profil?"

Głosowanie może być kluczowe dla Polski nawet jeśli jej nie wymienia wprost,
jeśli dotyczy sektora gdzie Polska jest dominującym graczem.

KATEGORIE:
🔴 KLUCZOWE (score 70-100): bezpośredni wpływ — zobowiązania prawne, przepływ
   funduszy, bezpieczeństwo wschodniej flanki, dominujący sektor PL.
🟡 ISTOTNE (score 40-69): pośredni wpływ ponadprzeciętny dla PL ze względu
   na jej strukturę gospodarczą lub geopolityczną.
⚪ NEUTRALNE (score 0-39): brak realnego wpływu — sektory marginalne dla PL,
   zarządzanie wewnętrzne UE, rezolucje o krajach bez związku z PL.

FORMAT ODPOWIEDZI (tylko JSON, nic poza JSON):
{{
  "relevance": "kluczowe" | "istotne" | "neutralne",
  "score": 0-100,
  "reasoning": "2-3 zdania po polsku — jeśli neutralne: dlaczego nie dotyczy PL",
  "key_factors": ["czynnik 1", "czynnik 2"],
  "low_confidence": true | false
}}
low_confidence = true gdy masz tylko tytuł bez opisu głosowania.

PRZYKŁADY:
Tytuł: "Eskalacja wojny i katastrofa humanitarna w Sudanie"
Odpowiedź: {{
  "relevance": "neutralne", "score": 5,
  "reasoning": "Rezolucja dotyczy konfliktu w Afryce Wschodniej bez związku z polskimi interesami gospodarczymi ani bezpieczeństwem.",
  "key_factors": [], "low_confidence": false
}}

Tytuł: "Dyrektywa o minimalnym wynagrodzeniu w UE"
Odpowiedź: {{
  "relevance": "istotne", "score": 58,
  "reasoning": "Dyrektywa wymaga wynagrodzenia min. 50% średniej krajowej. Polska ma jedno z niższych wynagrodzeń w UE — wymusi podwyżki uderzające w MŚP silniej niż w bogatszych krajach.",
  "key_factors": ["płaca minimalna", "MŚP", "rynek pracy"], "low_confidence": false
}}"""

PROMPT_B_SENSITIVE_ADDON = """
WAŻNE — to głosowanie dotyczy tematu wrażliwego politycznie.
Oceniaj WYŁĄCZNIE skutki prawne, finansowe i gospodarcze dla Polski
jako państwa członkowskiego. Nie oceniaj moralnej słuszności tematu
ani nie odnosz się do wewnętrznej debaty politycznej w Polsce."""


# ─────────────────────────────────────────────────────────────────────────────
# Pre-filter pipeline
# ─────────────────────────────────────────────────────────────────────────────

def _match(keywords: List[str], text: str) -> List[str]:
    """Return list of matched keywords (case-insensitive word-boundary match)."""
    return [
        kw for kw in keywords
        if re.search(r'(?<!\w)' + re.escape(kw), text, re.IGNORECASE | re.UNICODE)
    ]


def pre_filter(title: str) -> Optional[Dict[str, Any]]:
    """
    Run pre-filter checks. Returns auto-classification dict or None (needs AI).
    """
    t = title.lower()

    if _match(PROCEDURAL_KEYWORDS, t):
        return {
            'relevance': 'neutralne',
            'score': 0,
            'reasoning': 'Głosowanie proceduralne bez merytorycznego wpływu na Polskę.',
            'key_factors': [],
            'low_confidence': False,
            'auto_classified': True,
        }

    if _match(AUTO_KLUCZOWE, t):
        return {
            'relevance': 'kluczowe',
            'score': 90,
            'reasoning': 'Głosowanie bezpośrednio dotyczy kluczowych interesów polskich.',
            'key_factors': _match(AUTO_KLUCZOWE, t),
            'low_confidence': False,
            'auto_classified': True,
        }

    return None


def classify_prompt(title: str, description_text: str) -> tuple[str, bool, List[str]]:
    """
    Determine which AI prompt to use and whether sensitive.
    Returns (prompt_type, is_sensitive, matched_tags)
    prompt_type: 'A' or 'B'
    """
    combined = (title + ' ' + description_text).lower()
    is_sensitive = bool(_match(SENSITIVE_TOPICS, combined))

    hint_kluczowe_matches = _match(HINT_KLUCZOWE, combined)
    hint_istotne_matches = _match(HINT_ISTOTNE, combined)
    matched = hint_kluczowe_matches or hint_istotne_matches

    if matched:
        return 'A', is_sensitive, matched
    return 'B', is_sensitive, []


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────────────────────────────────────

def get_votes_needing_scoring(
    db_session: Session,
    vote_number_filter: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: Optional[int] = None,
    force: bool = False,
) -> List[Dict[str, Any]]:
    clauses: List[str] = []
    params: Dict[str, Any] = {}

    if not force:
        clauses.append("AND vi.poland_score IS NULL")

    if vote_number_filter:
        clauses.append("AND vi.vote_number = :vote_number")
        params['vote_number'] = vote_number_filter
    if from_date:
        clauses.append("AND vi.date >= :from_date")
        params['from_date'] = from_date
    if to_date:
        clauses.append("AND vi.date <= :to_date")
        params['to_date'] = to_date

    extra = '\n          '.join(clauses)
    limit_clause = f"LIMIT {int(limit)}" if limit else ""

    sql_query = text(f"""
        SELECT vi.vote_number,
               vi.title,
               vi.date,
               vi.context_ai,
               vi.vote_description,
               vi.topic_category
        FROM vote_items vi
        WHERE vi.is_representative = true
          {extra}
        ORDER BY vi.date DESC
        {limit_clause}
    """)
    rows = db_session.execute(sql_query, params).fetchall()

    return [
        {
            'vote_number':    row.vote_number,
            'title':          row.title,
            'date':           str(row.date),
            'context_ai':     row.context_ai,
            'vote_description': row.vote_description,
            'topic_category': row.topic_category,
        }
        for row in rows
    ]


def update_poland_score(
    db_session: Session,
    vote_number: str,
    score: int,
    relevance_json: str,
    dry_run: bool,
) -> None:
    if dry_run:
        logger.info(f"  [dry-run] Would update poland_score={score} for vote {vote_number}")
        return

    db_session.execute(
        text("""
            UPDATE vote_items
               SET poland_score = :score,
                   poland_relevance_data = CAST(:data AS jsonb),
                   updated_at = NOW()
             WHERE vote_number = :vn
        """),
        {'score': score, 'data': relevance_json, 'vn': vote_number},
    )
    db_session.commit()


# ─────────────────────────────────────────────────────────────────────────────
# AI helper
# ─────────────────────────────────────────────────────────────────────────────

def build_user_message(vote: Dict[str, Any], prompt_type: str, matched_tags: List[str]) -> str:
    vote_desc_parsed = None
    if vote['vote_description']:
        try:
            vote_desc_parsed = json.loads(vote['vote_description'])
        except (json.JSONDecodeError, TypeError):
            pass

    description_text = (
        (vote_desc_parsed.get('description') if vote_desc_parsed else None)
        or vote['context_ai']
        or "(brak opisu — oceń na podstawie tytułu, ustaw low_confidence: true)"
    )

    if prompt_type == 'A':
        return (
            f"Oceń stopień istotności i skutki dla Polski:\n\n"
            f"TYTUŁ: {vote['title']}\n"
            f"SYGNAŁY Z TAGÓW: {', '.join(matched_tags)}\n"
            f"KATEGORIA: {vote.get('topic_category') or 'nieznana'}\n"
            f"DATA: {vote['date']}\n\n"
            f"OPIS GŁOSOWANIA:\n{description_text[:2000]}\n\n"
            "Zwróć wyłącznie JSON."
        )
    else:
        return (
            f"Oceń istotność dla Polski:\n\n"
            f"TYTUŁ: {vote['title']}\n"
            f"KATEGORIA: {vote.get('topic_category') or 'nieznana'}\n"
            f"DATA: {vote['date']}\n\n"
            f"OPIS GŁOSOWANIA:\n{description_text[:2000]}\n\n"
            "Zwróć wyłącznie JSON."
        )


def call_claude(
    client: Any,
    vote: Dict[str, Any],
    prompt_type: str,
    is_sensitive: bool,
    matched_tags: List[str],
) -> Optional[Dict[str, Any]]:
    if prompt_type == 'A':
        system = PROMPT_A_SYSTEM
    else:
        system = PROMPT_B_SYSTEM
        if is_sensitive:
            system += PROMPT_B_SENSITIVE_ADDON

    user_msg = build_user_message(vote, prompt_type, matched_tags)

    try:
        message = client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=400,
            temperature=0.1,
            system=system,
            messages=[{'role': 'user', 'content': user_msg}],
        )
    except Exception as e:
        logger.warning(f"Claude API call failed: {e}")
        return None

    response_text = message.content[0].text.strip()

    if response_text.startswith('```'):
        lines = response_text.split('\n')
        response_text = '\n'.join(
            line for line in lines
            if not line.startswith('```')
        ).strip()

    try:
        result = json.loads(response_text)
        required = {'relevance', 'score', 'reasoning', 'key_factors', 'low_confidence'}
        if not required.issubset(result.keys()):
            logger.warning(f"Claude response missing keys: {list(result.keys())}")
            return None
        if result['relevance'] not in ('kluczowe', 'istotne', 'neutralne'):
            logger.warning(f"Unexpected relevance value: {result['relevance']}")
            return None
        result['score'] = max(0, min(100, int(result['score'])))
        if not isinstance(result['key_factors'], list):
            result['key_factors'] = []
        return result
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(f"Failed to parse Claude JSON: {e}")
        logger.warning(f"Raw response: {response_text[:200]}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Main processing loop
# ─────────────────────────────────────────────────────────────────────────────

def run(
    db_url: str,
    api_key: Optional[str] = None,
    vote_number_filter: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: Optional[int] = None,
    dry_run: bool = False,
    force: bool = False,
) -> None:
    engine = create_engine(db_url)
    db_session = Session(engine)

    claude_client = None
    if not api_key:
        logger.error("ANTHROPIC_API_KEY not set.")
        sys.exit(1)
    try:
        import anthropic
        claude_client = anthropic.Anthropic(api_key=api_key)
    except ImportError:
        logger.error("anthropic package not installed. Run: pip install -r requirements.txt")
        sys.exit(1)

    try:
        logger.info("=" * 70)
        logger.info("populate_poland_relevance — starting")
        logger.info(f"  dry_run  = {dry_run}")
        logger.info(f"  force    = {force}")
        if vote_number_filter:
            logger.info(f"  vote_number = {vote_number_filter}")
        if from_date:
            logger.info(f"  from_date   = {from_date}")
        if to_date:
            logger.info(f"  to_date     = {to_date}")
        if limit:
            logger.info(f"  limit       = {limit}")
        logger.info("=" * 70)

        candidates = get_votes_needing_scoring(
            db_session, vote_number_filter, from_date, to_date, limit, force
        )
        logger.info(f"Found {len(candidates)} votes to score")

        if not candidates:
            logger.info("Nothing to do.")
            return

        auto_ok = 0
        ai_ok = 0
        ai_fail = 0
        processed = 0

        for i, vote in enumerate(candidates, 1):
            vote_number = vote['vote_number']

            if i % 25 == 0 or i == len(candidates):
                logger.info(f"Processing {i}/{len(candidates)}: vote {vote_number}")

            generated_at = datetime.now(timezone.utc).isoformat()

            # ── Pre-filter ─────────────────────────────────────────────────
            auto_result = pre_filter(vote['title'])
            if auto_result:
                result_data = {
                    **auto_result,
                    'is_sensitive': False,
                    'model': None,
                    'generated_at': generated_at,
                }
                auto_ok += 1
            else:
                # ── Classify which prompt ──────────────────────────────────
                vote_desc_parsed = None
                if vote['vote_description']:
                    try:
                        vote_desc_parsed = json.loads(vote['vote_description'])
                    except (json.JSONDecodeError, TypeError):
                        pass

                description_text = (
                    (vote_desc_parsed.get('description') if vote_desc_parsed else None)
                    or vote['context_ai']
                    or ''
                )

                prompt_type, is_sensitive, matched_tags = classify_prompt(
                    vote['title'], description_text
                )

                ai_result = call_claude(
                    claude_client, vote, prompt_type, is_sensitive, matched_tags
                )
                if not ai_result:
                    ai_fail += 1
                    logger.info(f"  [skip] AI failed for vote {vote_number}")
                    continue
                ai_ok += 1
                result_data = {
                    **ai_result,
                    'is_sensitive': is_sensitive,
                    'auto_classified': False,
                    'model': 'claude-haiku-4-5-20251001',
                    'generated_at': generated_at,
                }

            score = result_data['score']
            relevance_json = json.dumps(result_data, ensure_ascii=False)

            update_poland_score(db_session, vote_number, score, relevance_json, dry_run)
            processed += 1

        logger.info("=" * 70)
        logger.info("populate_poland_relevance — done")
        logger.info(f"  Candidates:      {len(candidates)}")
        logger.info(f"  Auto-classified: {auto_ok}")
        logger.info(f"  AI ok:           {ai_ok}")
        logger.info(f"  AI fail:         {ai_fail}")
        logger.info(f"  Scores written:  {processed}")
        if dry_run:
            logger.info("  (dry-run — nothing was actually written)")
        logger.info("=" * 70)

    finally:
        db_session.close()
        engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Populate vote_items.poland_score via pre-filter + Claude Haiku"
    )
    parser.add_argument('--vote-number', type=str, default=None)
    parser.add_argument('--from-date', type=str, default=None, metavar='YYYY-MM-DD')
    parser.add_argument('--to-date', type=str, default=None, metavar='YYYY-MM-DD')
    parser.add_argument('--limit', type=int, default=None, metavar='N',
                        help='Process at most N votes (for testing)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Run AI but do not write to DB')
    parser.add_argument('--force', action='store_true',
                        help='Re-process votes that already have a poland_score')

    args = parser.parse_args()

    load_dotenv()
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("Error: DATABASE_URL not set in environment")
        sys.exit(1)

    api_key = os.getenv('ANTHROPIC_API_KEY')

    run(
        db_url=db_url,
        api_key=api_key,
        vote_number_filter=args.vote_number,
        from_date=args.from_date,
        to_date=args.to_date,
        limit=args.limit,
        dry_run=args.dry_run,
        force=args.force,
    )


if __name__ == '__main__':
    main()
