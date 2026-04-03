#!/usr/bin/env python3
"""
Populate votes.vote_description with AI-generated Polish descriptions.

For each vote that has an OEIL_SUMMARY source and no vote_description yet:
  1. Fetch the OEIL document-summary page content via SourcesScraper
  2. Send title + body to Claude Haiku 4.5 for translation/formatting
  3. Store the JSON result in votes.vote_description

Output JSON stored in vote_description:
    {
        "description": "Parlament Europejski uchwalił...",
        "bullets": ["Punkt 1", "Punkt 2"],
        "source_url": "https://oeil.europarl.europa.eu/...",
        "source_type": "OEIL_SUMMARY",
        "generated_at": "2026-03-22T..."
    }

Usage:
    python scripts/populate_vote_descriptions.py               # all eligible
    python scripts/populate_vote_descriptions.py --vote-number 184110
    python scripts/populate_vote_descriptions.py --from-date 2025-01-01
    python scripts/populate_vote_descriptions.py --dry-run
    python scripts/populate_vote_descriptions.py --skip-ai     # raw extraction only
    python scripts/populate_vote_descriptions.py --force       # re-process filled votes
"""

import json
import os
import sys
import argparse
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.scrapers.sources import SourcesScraper
from scripts.utils.logger import setup_logger

logger = setup_logger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# AI prompt
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Jesteś ekspertem od polityki Unii Europejskiej. Twoim zadaniem jest przetłumaczenie \
i uproszczenie anglojęzycznego streszczenia dokumentu legislacyjnego na przystępny polski opis \
dla przeciętnego obywatela.

Zasady:
- Pisz w języku polskim, prostym i zrozumiałym stylem
- Opisz co uchwalono/odrzucono i jakie to ma znaczenie praktyczne
- Unikaj żargonu legislacyjnego; gdy musisz użyć terminu technicznego, krótko go wyjaśnij
- Bądź obiektywny i neutralny politycznie
- NIE cytuj bezpośrednio z angielskiego oryginału

Format odpowiedzi (JSON, bez markdown):
{
  "description": "2-3 zdania opisujące o co chodziło w głosowaniu (max 150 słów)",
  "bullets": ["Kluczowy punkt 1", "Kluczowy punkt 2", "Kluczowy punkt 3"]
}

Wskazówki:
- description: pierwsze zdanie — co to za głosowanie; drugie — co ono zmienia/znaczy
- bullets: 2-4 konkretne punkty z liczby, terminy, kogo dotyczy
- Maksymalnie 4 bullet points
"""


def create_user_prompt(title: str, body: str) -> str:
    # Truncate body to ~3000 chars to stay well within token limit
    body_truncated = body[:3000]
    if len(body) > 3000:
        body_truncated += '\n[...]'

    return (
        f"TYTUŁ DOKUMENTU (angielski):\n{title}\n\n"
        f"TREŚĆ STRESZCZENIA:\n{body_truncated}\n\n"
        "Przetłumacz i sformatuj jako JSON zgodnie z instrukcją systemową."
    )


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────────────────────────────────────

def get_votes_needing_description(
    db_session: Session,
    vote_number_filter: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    force: bool = False,
) -> List[Dict[str, Any]]:
    """
    Return votes that have an OEIL_SUMMARY source but no vote_description yet.
    With --force, return all votes with OEIL_SUMMARY regardless.
    """
    clauses: List[str] = []
    params: Dict[str, Any] = {}

    if vote_number_filter:
        clauses.append("AND vs.vote_number = :vote_number")
        params['vote_number'] = vote_number_filter
    if from_date:
        clauses.append("AND vi.date >= :from_date")
        params['from_date'] = from_date
    if to_date:
        clauses.append("AND vi.date <= :to_date")
        params['to_date'] = to_date

    extra = '\n          '.join(clauses)

    if force:
        no_desc_filter = ""
    else:
        no_desc_filter = """
          AND vi.vote_description IS NULL"""

    sql = text(f"""
        SELECT DISTINCT ON (vs.vote_number)
            vs.vote_number,
            vs.url    AS oeil_summary_url
        FROM vote_sources vs
        JOIN vote_items vi ON vi.vote_number = vs.vote_number
        WHERE vs.source_type = 'OEIL_SUMMARY'
          {extra}
          {no_desc_filter}
        ORDER BY vs.vote_number, vs.id
    """)
    rows = db_session.execute(sql, params).fetchall()

    return [
        {
            'vote_number':      row.vote_number,
            'oeil_summary_url': row.oeil_summary_url,
        }
        for row in rows
    ]


def update_vote_description(
    db_session: Session,
    vote_number: str,
    description_json: str,
    dry_run: bool,
) -> None:
    """Update votes.vote_description for the given vote_number."""
    if dry_run:
        logger.info(
            f"  [dry-run] Would update vote_description for vote {vote_number}"
        )
        return

    db_session.execute(
        text("""
            UPDATE vote_items
               SET vote_description = :desc,
                   updated_at = NOW()
             WHERE vote_number = :vn
        """),
        {'desc': description_json, 'vn': vote_number},
    )
    db_session.commit()


# ─────────────────────────────────────────────────────────────────────────────
# AI helper
# ─────────────────────────────────────────────────────────────────────────────

def call_claude(client: Any, title: str, body: str) -> Optional[Dict[str, Any]]:
    """
    Call Claude Haiku 4.5 to generate a structured Polish description.
    Returns parsed dict or None on failure.
    """
    user_prompt = create_user_prompt(title, body)

    try:
        message = client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=600,
            temperature=0.3,
            system=SYSTEM_PROMPT,
            messages=[{'role': 'user', 'content': user_prompt}],
        )
    except Exception as e:
        logger.warning(f"Claude API call failed: {e}")
        return None

    response_text = message.content[0].text.strip()

    # Strip markdown code fences if present
    if response_text.startswith('```'):
        lines = response_text.split('\n')
        response_text = '\n'.join(
            line for line in lines
            if not line.startswith('```')
        ).strip()

    try:
        result = json.loads(response_text)
        if 'description' not in result or 'bullets' not in result:
            logger.warning(
                f"Claude response missing required keys: {list(result.keys())}"
            )
            return None
        if not isinstance(result['bullets'], list):
            result['bullets'] = []
        return result
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse Claude JSON response: {e}")
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
    dry_run: bool = False,
    skip_ai: bool = False,
    force: bool = False,
) -> None:
    """Main processing loop."""

    engine = create_engine(db_url)
    db_session = Session(engine)

    # Set up Claude client (unless --skip-ai)
    claude_client = None
    if not skip_ai:
        if not api_key:
            logger.error(
                "ANTHROPIC_API_KEY not set. Use --skip-ai to run without AI."
            )
            sys.exit(1)
        try:
            import anthropic
            claude_client = anthropic.Anthropic(api_key=api_key)
        except ImportError:
            logger.error(
                "anthropic package not installed. Run: pip install -r requirements.txt"
            )
            sys.exit(1)

    try:
        logger.info("=" * 70)
        logger.info("populate_vote_descriptions — starting")
        logger.info(f"  dry_run    = {dry_run}")
        logger.info(f"  skip_ai    = {skip_ai}")
        logger.info(f"  force      = {force}")
        if vote_number_filter:
            logger.info(f"  vote_number = {vote_number_filter}")
        if from_date:
            logger.info(f"  from_date   = {from_date}")
        if to_date:
            logger.info(f"  to_date     = {to_date}")
        logger.info("=" * 70)

        candidates = get_votes_needing_description(
            db_session, vote_number_filter, from_date, to_date, force
        )
        logger.info(
            f"Found {len(candidates)} votes with OEIL_SUMMARY "
            f"{'(including already described)' if force else '(no description yet)'}"
        )

        if not candidates:
            logger.info("Nothing to do.")
            return

        processed = 0
        fetch_ok = 0
        fetch_fail = 0
        ai_ok = 0
        ai_fail = 0

        with SourcesScraper() as scraper:
            for i, candidate in enumerate(candidates, 1):
                vote_number = candidate['vote_number']
                oeil_url    = candidate['oeil_summary_url']

                if i % 25 == 0 or i == len(candidates):
                    logger.info(
                        f"Processing {i}/{len(candidates)}: vote {vote_number}"
                    )

                # ── Step 1: Fetch OEIL summary page ───────────────────────────
                content = scraper.fetch_oeil_summary_content(oeil_url)
                if not content:
                    fetch_fail += 1
                    logger.info(
                        f"  [skip] Could not fetch content for vote {vote_number}"
                    )
                    continue
                fetch_ok += 1

                # ── Step 2: Generate description (AI or raw) ──────────────────
                generated_at = datetime.now(timezone.utc).isoformat()

                if skip_ai:
                    # Store raw extraction without AI translation
                    result_dict = {
                        'description': content['body'][:500],
                        'bullets': [],
                        'source_url': oeil_url,
                        'source_type': 'OEIL_SUMMARY',
                        'generated_at': generated_at,
                        'raw_only': True,
                    }
                    ai_ok += 1
                else:
                    ai_result = call_claude(
                        claude_client,
                        content['title'],
                        content['body'],
                    )
                    if not ai_result:
                        ai_fail += 1
                        logger.info(
                            f"  [skip] AI failed for vote {vote_number}"
                        )
                        continue
                    ai_ok += 1
                    result_dict = {
                        **ai_result,
                        'source_url': oeil_url,
                        'source_type': 'OEIL_SUMMARY',
                        'generated_at': generated_at,
                    }

                # ── Step 3: Store ──────────────────────────────────────────────
                description_json = json.dumps(result_dict, ensure_ascii=False)
                update_vote_description(
                    db_session, vote_number, description_json, dry_run
                )
                processed += 1

        # Summary
        logger.info("=" * 70)
        logger.info("populate_vote_descriptions — done")
        logger.info(f"  Candidates:     {len(candidates)}")
        logger.info(f"  Fetch ok:       {fetch_ok}")
        logger.info(f"  Fetch fail:     {fetch_fail}")
        if not skip_ai:
            logger.info(f"  AI ok:          {ai_ok}")
            logger.info(f"  AI fail:        {ai_fail}")
        logger.info(f"  Descriptions written: {processed}")
        if dry_run:
            logger.info("  (dry-run — nothing was actually written)")
        logger.info("=" * 70)

    finally:
        db_session.close()
        engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Populate votes.vote_description from OEIL summary pages via Claude"
    )
    parser.add_argument(
        '--vote-number',
        type=str,
        default=None,
        help='Process only this vote_number (e.g. 184110)',
    )
    parser.add_argument(
        '--from-date',
        type=str,
        default=None,
        metavar='YYYY-MM-DD',
        help='Only process votes on or after this date',
    )
    parser.add_argument(
        '--to-date',
        type=str,
        default=None,
        metavar='YYYY-MM-DD',
        help='Only process votes on or before this date',
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Fetch and generate descriptions but do not write to DB',
    )
    parser.add_argument(
        '--skip-ai',
        action='store_true',
        help='Store raw OEIL text extraction without calling Claude (testing)',
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Re-process votes that already have a vote_description',
    )

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
        dry_run=args.dry_run,
        skip_ai=args.skip_ai,
        force=args.force,
    )


if __name__ == '__main__':
    main()
