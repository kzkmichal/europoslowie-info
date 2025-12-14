# AI_PROMPTS.md

**Status:** Draft  
**Last Updated:** 2024-12-10  
**Owner:** Michał  
**Version:** 0.1

---

## Purpose

Ten dokument zawiera wszystkie prompty używane do komunikacji z Anthropic Claude API, wraz z przykładami input/output, kryteriami jakości oraz strategiami optymalizacji kosztów.

---

## TL;DR

**Models used:**

- **Claude Sonnet 4** (`claude-sonnet-4-20250514`) - Context explanation (quality critical)
- **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) - Poland relevance scoring, argument extraction (simpler tasks)

**Cost per vote:** ~$0.04 (all 3 prompts combined)  
**Monthly cost:** 150 votes × $0.04 = **$6.00**

---

## AI Pipeline Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    INPUT: Raw Vote Data                     │
│  • Title: "Budget UE 2025"                                  │
│  • Document summary (5k tokens)                             │
│  • Debate transcript (if available)                         │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  PROMPT 1: Context Explanation                              │
│  Model: Claude Sonnet 4 (quality critical)                  │
│  Cost: ~$0.02 per vote                                      │
│  Cache: YES (reuse for all 53 MEPs)                         │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  PROMPT 2: Poland Relevance Scoring                         │
│  Model: Claude Haiku 4.5 (cheaper, structured output)      │
│  Cost: ~$0.01 per vote                                      │
│  Cache: YES                                                 │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  PROMPT 3: Arguments Extraction                             │
│  Model: Claude Haiku 4.5 (cheaper)                          │
│  Cost: ~$0.01 per vote                                      │
│  Cache: YES (if transcript available)                       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   OUTPUT: Enriched Data                     │
│  • context_ai: "To głosowanie dotyczyło..."                │
│  • stars_poland: 5                                          │
│  • stars_reasoning: ["Polska wymieniona...", ...]          │
│  • arguments_for: ["Zwiększa fundusze...", ...]            │
│  • arguments_against: ["Za wysokie koszty...", ...]        │
└─────────────────────────────────────────────────────────────┘
```

---

## Prompt 1: Context Explanation

### Purpose

Translate complex EU legislative language into simple Polish that average citizen can understand.

### Model

**Claude Sonnet 4** (`claude-sonnet-4-20250514`)

- Why: Quality is critical here - this is user-facing text
- Cost: $3/1M input, $15/1M output tokens

### Prompt Template

```python
CONTEXT_EXPLANATION_SYSTEM_PROMPT = """Jesteś ekspertem od polityki Unii Europejskiej, specjalizującym się w tłumaczeniu skomplikowanego języka legislacyjnego na prosty, zrozumiały polski.

Twoje zadanie:
- Wyjaśnij głosowanie w Parlamencie Europejskim w sposób zrozumiały dla przeciętnego Polaka
- Używaj prostego języka, unikaj żargonu
- Bądź obiektywny i neutralny politycznie
- Skup się na faktach, nie opiniach
- Wyjaśnij dlaczego to głosowanie jest ważne

Format odpowiedzi:
- 2-3 zdania (100-150 słów)
- Pierwsze zdanie: co to było za głosowanie
- Drugie zdanie: kto to proponował i dlaczego
- Trzecie zdanie (opcjonalne): główne punkty sporne

Przykład dobrej odpowiedzi:
"Parlament Europejski głosował nad budżetem UE na 2025 rok. Komisja Europejska zaproponowała zwiększenie wydatków na politykę spójności o 12%, co bezpośrednio wpływa na Polskę jako głównego beneficjenta tych funduszy. Głównym punktem spornym była wysokość cięć w funduszach rolnych, które mogą dotknąć polskich rolników."

NIE rób tego:
- Nie używaj skrótów bez wyjaśnienia (np. pisze "Parlament Europejski", nie "PE")
- Nie oceniaj czy głosowanie było dobre/złe
- Nie pisz więcej niż 150 słów
- Nie cytuj bezpośrednio z dokumentów legislacyjnych
"""

def create_context_prompt(vote_data: dict) -> str:
    """Create prompt for context explanation"""

    user_prompt = f"""Wyjaśnij poniższe głosowanie w Parlamencie Europejskim prostym językiem:

TYTUŁ: {vote_data['title']}

TYTUŁ ANGIELSKI: {vote_data.get('title_en', 'N/A')}

NUMER DOKUMENTU: {vote_data.get('document_reference', 'N/A')}

STRESZCZENIE DOKUMENTU:
{vote_data.get('document_summary', 'Brak dostępnego streszczenia')}

DATA GŁOSOWANIA: {vote_data['date']}

WYNIK: {'Przyjęto' if vote_data['result'] == 'ADOPTED' else 'Odrzucono'}
- ZA: {vote_data.get('votes_for', 0)}
- PRZECIW: {vote_data.get('votes_against', 0)}
- WSTRZYMAŁO SIĘ: {vote_data.get('votes_abstain', 0)}

Wyjaśnij w 2-3 zdaniach (100-150 słów) co to było za głosowanie i dlaczego jest ważne."""

    return user_prompt
```

### Example Input/Output

**Input:**

```python
vote_data = {
    'title': 'Budżet ogólny Unii Europejskiej na rok budżetowy 2025 – wszystkie sekcje',
    'title_en': 'General budget of the European Union for the financial year 2025 – all sections',
    'document_reference': 'COM(2024)400',
    'document_summary': '''The European Commission proposes the EU budget for 2025
    with total commitment appropriations of €199.4 billion. Key changes include:
    - Cohesion Policy: +12% increase (€54.3 billion)
    - Common Agricultural Policy: -3% decrease (€58.8 billion)
    - Erasmus+: +8% increase (€4.2 billion)
    Poland is the largest beneficiary of Cohesion funds...''',
    'date': '2024-11-12',
    'result': 'ADOPTED',
    'votes_for': 487,
    'votes_against': 123,
    'votes_abstain': 45
}
```

**Output:**

```json
{
  "context_ai": "Parlament Europejski przyjął budżet Unii Europejskiej na 2025 rok o wartości 199,4 miliarda euro. Komisja Europejska zaproponowała zwiększenie funduszy na politykę spójności o 12% (głównie dla krajów takich jak Polska), ale jednocześnie obcięcie dotacji rolnych o 3%. Głównym punktem spornym były cięcia w Wspólnej Polityce Rolnej, które spotkały się z oporem posłów z krajów o silnym sektorze rolnym."
}
```

**Quality check:** ✅

- Simple language: ✓
- 2-3 sentences: ✓
- ~120 words: ✓
- Explains what, who, why: ✓
- Mentions Poland context: ✓
- No political bias: ✓

---

## Prompt 2: Poland Relevance Scoring

### Purpose

Objectively rate how relevant a vote is to Poland on a 1-5 star scale based on quantifiable criteria.

### Model

**Claude Haiku 4.5** (`claude-haiku-4-5-20251001`)

- Why: Structured task, doesn't need Sonnet's sophistication
- Cost: $1/1M input, $5/1M output tokens (5x cheaper than Sonnet)

### Scoring Criteria

```
⭐⭐⭐⭐⭐ (5/5) - KRYTYCZNY wpływ na Polskę:
- Polska wymieniona >5 razy w dokumencie ORAZ
- Wpływ finansowy >500M EUR/rok LUB
- Dotyczy >100k miejsc pracy w Polsce LUB
- >10 polskich posłów aktywnych w debacie

⭐⭐⭐⭐ (4/5) - WYSOKI wpływ:
- Polska wymieniona 2-5 razy ORAZ
- Wpływ finansowy 100-500M EUR/rok LUB
- Dotyczy ważnego sektora dla Polski (rolnictwo, przemysł) LUB
- 5-10 polskich posłów aktywnych w debacie

⭐⭐⭐ (3/5) - ŚREDNI wpływ:
- Polska wymieniona 1-2 razy LUB
- Pośredni wpływ ekonomiczny LUB
- Polska jeden z wielu dotkniętych krajów LUB
- Dotyczy sektora obecnego w Polsce

⭐⭐ (2/5) - NISKI wpływ:
- Ogólnoeuropejskie przepisy bez specyfiki Polski
- Minimalny wpływ finansowy (<10M EUR)
- Brak wzmianek o Polsce w dokumencie

⭐ (1/5) - MINIMALNY wpływ:
- Nie dotyczy Polski w żaden znaczący sposób
- Sprawy wewnętrzne innych krajów
- Proceduralny/administracyjny bez wpływu
```

### Prompt Template

```python
POLAND_RELEVANCE_SYSTEM_PROMPT = """Jesteś analitykiem politycznym specjalizującym się w ocenie wpływu legislacji UE na Polskę.

Twoje zadanie:
- Oceń związek głosowania z Polską w skali 1-5 gwiazdek
- Bazuj TYLKO na obiektywnych, mierzalnych kryteriach
- Użyj ścisłych kryteriów określonych poniżej
- Podaj konkretne uzasadnienie (liczby, fakty)

Kryteria oceny:
⭐⭐⭐⭐⭐ (5/5) - KRYTYCZNY:
- Polska wymieniona >5x w dokumencie ORAZ
- Wpływ finansowy >500M EUR/rok LUB >100k miejsc pracy

⭐⭐⭐⭐ (4/5) - WYSOKI:
- Polska wymieniona 2-5x ORAZ
- Wpływ finansowy 100-500M EUR LUB ważny sektor dla PL

⭐⭐⭐ (3/5) - ŚREDNI:
- Polska wymieniona 1-2x LUB pośredni wpływ ekonomiczny

⭐⭐ (2/5) - NISKI:
- Ogólnoeuropejskie bez specyfiki Polski

⭐ (1/5) - MINIMALNY:
- Nie dotyczy Polski w znaczący sposób

Format odpowiedzi (JSON):
{
  "stars": 1-5,
  "reasoning": [
    "Fakt 1 z liczbami",
    "Fakt 2 z liczbami",
    "Fakt 3 z liczbami"
  ],
  "confidence": "high" | "medium" | "low",
  "key_figures": {
    "poland_mentions": number,
    "financial_impact_eur": number or null,
    "jobs_affected": number or null
  }
}

WAŻNE:
- Nie oceniaj czy dobrze/źle dla Polski, tylko JAK BARDZO dotyczy Polski
- Bazuj na faktach z dokumentu, nie przypuszczeniach
- Jeśli brak danych liczbowych, użyj confidence: "low"
"""

def create_poland_relevance_prompt(vote_data: dict, context: str) -> str:
    """Create prompt for Poland relevance scoring"""

    user_prompt = f"""Oceń związek tego głosowania z Polską (1-5 gwiazdek):

TYTUŁ: {vote_data['title']}

KONTEKST (wygenerowany wcześniej):
{context}

DOKUMENT (pełny tekst lub streszczenie):
{vote_data.get('document_full_text', vote_data.get('document_summary', ''))}

INFORMACJE O POLSCE W DOKUMENCIE:
{vote_data.get('poland_specific_info', 'Brak szczegółowych informacji o Polsce')}

DANE DODATKOWE:
- Data: {vote_data['date']}
- Wynik: {vote_data['result']}
- Kategoria: {vote_data.get('topic_category', 'unknown')}

Zwróć ocenę w formacie JSON zgodnie z systemowym promptem."""

    return user_prompt
```

### Example Input/Output

**Input:**

```python
vote_data = {
    'title': 'Budżet ogólny Unii Europejskiej na rok budżetowy 2025',
    'document_summary': '''Budget proposal includes:
    - Cohesion Policy: €54.3bn (+12%) - Poland is largest beneficiary with €17.8bn
    - CAP: €58.8bn (-3%) - Poland receives €8.4bn
    - Total Polish allocation: €26.2bn (13% of EU budget)
    Impact on Poland: Creates 120,000 direct jobs in infrastructure projects...''',
    'topic_category': 'budget',
    'date': '2024-11-12'
}

context = "Parlament Europejski przyjął budżet UE na 2025..."
```

**Output:**

```json
{
  "stars": 5,
  "reasoning": [
    "Polska wymieniona 7 razy jako główny beneficjent funduszy spójności",
    "Bezpośredni wpływ finansowy: 26,2 mld EUR (13% całego budżetu UE)",
    "Szacowany wpływ na rynek pracy: 120 tysięcy miejsc pracy w projektach infrastrukturalnych",
    "Polska największym beneficjentem zwiększenia środków na politykę spójności (+12%, co daje dodatkowe 1,8 mld EUR)"
  ],
  "confidence": "high",
  "key_figures": {
    "poland_mentions": 7,
    "financial_impact_eur": 26200000000,
    "jobs_affected": 120000
  }
}
```

**Quality check:** ✅

- Stars match criteria: ✓ (>5 mentions, >500M EUR, >100k jobs)
- Reasoning is factual: ✓
- Numbers are specific: ✓
- High confidence justified: ✓
- JSON format correct: ✓

---

## Prompt 3: Arguments Extraction

### Purpose

Extract key arguments FOR and AGAINST from parliamentary debate transcripts.

### Model

**Claude Haiku 4.5** (`claude-haiku-4-5-20251001`)

- Why: Pattern extraction task, doesn't need complex reasoning
- Cost: $1/1M input, $5/1M output tokens

### Prompt Template

```python
ARGUMENTS_EXTRACTION_SYSTEM_PROMPT = """Jesteś analitykiem debat parlamentarnych. Twoim zadaniem jest wyciągnięcie kluczowych argumentów ZA i PRZECIW głosowaniu.

Zasady:
- Wyciągaj TYLKO faktyczne argumenty z transkrypcji
- Cytuj konkretne fragmenty (w cudzysłowie)
- Podaj kto wypowiedział argument (imię, partia/grupa)
- Wybierz 3-5 najważniejszych argumentów z każdej strony
- Zachowaj neutralność - przedstaw obie strony równie

Format argumentu:
"[Cytat z wypowiedzi]" — [Imię Nazwisko], [Grupa polityczna]

Format odpowiedzi (JSON):
{
  "arguments_for": [
    {
      "quote": "Cytat z wypowiedzi",
      "speaker": "Imię Nazwisko",
      "group": "EPP/S&D/ECR/etc",
      "country": "PL/DE/FR/etc"
    }
  ],
  "arguments_against": [
    {
      "quote": "Cytat z wypowiedzi",
      "speaker": "Imię Nazwisko",
      "group": "EPP/S&D/ECR/etc",
      "country": "PL/DE/FR/etc"
    }
  ],
  "debate_summary": "1-2 zdania podsumowania głównej linii podziału"
}

WAŻNE:
- Jeśli brak transkrypcji, zwróć puste listy
- Nie wymyślaj argumentów - tylko z transkrypcji
- Priorytetyzuj argumenty polskich posłów jeśli dostępne
- Unikaj powtórzeń - każdy argument unikalny
"""

def create_arguments_prompt(vote_data: dict) -> str:
    """Create prompt for arguments extraction"""

    # Check if transcript available
    if not vote_data.get('debate_transcript'):
        return None  # Skip this prompt if no transcript

    user_prompt = f"""Wyciągnij kluczowe argumenty z poniższej debaty parlamentarnej:

TYTUŁ GŁOSOWANIA: {vote_data['title']}

TRANSKRYPCJA DEBATY:
{vote_data['debate_transcript']}

KONTEKST (dla zrozumienia):
{vote_data.get('context_ai', '')}

Wyciągnij 3-5 najważniejszych argumentów ZA i PRZECIW. Priorytetyzuj wypowiedzi polskich posłów jeśli są dostępne."""

    return user_prompt
```

### Example Input/Output

**Input:**

```python
vote_data = {
    'title': 'Budżet UE 2025',
    'debate_transcript': '''
[Jan Kowalski, ECR, PL]: Jako główny beneficjent funduszy spójności,
Polska nie może zgodzić się na cięcia w tych funduszach. Zwiększenie o 12%
to minimum potrzebne do kontynuowania projektów infrastrukturalnych, które
tworzą miejsca pracy w regionach.

[Hans Mueller, EPP, DE]: Wspieramy zwiększenie funduszy spójności dla Polski
i innych krajów Europy Środkowej. To inwestycja w wyrównanie poziomu rozwoju
całej Unii.

[Marie Dubois, ID, FR]: Sprzeciwiamy się dalszemu zwiększaniu wydatków.
Budżet UE jest już zbyt duży, a kraje płacące netto są przeciążone.
Potrzebujemy oszczędności, nie kolejnych wydatków.

[Pietro Rossi, S&D, IT]: Ubolewam nad cięciami w funduszach rolnych.
Zmniejszenie o 3% uderzy w europejskich rolników, którzy już borykają się
z trudnościami. To krótkowzroczna polityka.

[Anna Nowak, S&D, PL]: Popieram zwiększenie funduszy spójności, ale cięcia
w polityce rolnej są nieakceptowalne dla polskich rolników. Powinniśmy
znaleźć kompromis, który nie szkodzi ani jednemu, ani drugiemu sektorowi.
'''
}
```

**Output:**

```json
{
  "arguments_for": [
    {
      "quote": "Zwiększenie o 12% to minimum potrzebne do kontynuowania projektów infrastrukturalnych, które tworzą miejsca pracy w regionach",
      "speaker": "Jan Kowalski",
      "group": "ECR",
      "country": "PL"
    },
    {
      "quote": "To inwestycja w wyrównanie poziomu rozwoju całej Unii",
      "speaker": "Hans Mueller",
      "group": "EPP",
      "country": "DE"
    },
    {
      "quote": "Popieram zwiększenie funduszy spójności",
      "speaker": "Anna Nowak",
      "group": "S&D",
      "country": "PL"
    }
  ],
  "arguments_against": [
    {
      "quote": "Budżet UE jest już zbyt duży, a kraje płacące netto są przeciążone. Potrzebujemy oszczędności, nie kolejnych wydatków",
      "speaker": "Marie Dubois",
      "group": "ID",
      "country": "FR"
    },
    {
      "quote": "Zmniejszenie o 3% uderzy w europejskich rolników, którzy już borykają się z trudnościami. To krótkowzroczna polityka",
      "speaker": "Pietro Rossi",
      "group": "S&D",
      "country": "IT"
    },
    {
      "quote": "Cięcia w polityce rolnej są nieakceptowalne dla polskich rolników",
      "speaker": "Anna Nowak",
      "group": "S&D",
      "country": "PL"
    }
  ],
  "debate_summary": "Główna linia podziału dotyczy balansu między zwiększeniem funduszy spójności (wspierane przez kraje Europy Środkowej) a cięciami w polityce rolnej (krytykowane przez posłów z silnym sektorem rolniczym). Dodatkowy spór między krajami płacącymi netto a beneficjentami budżetu."
}
```

**Quality check:** ✅

- Only real quotes: ✓
- Speaker attribution: ✓
- 3-5 arguments each side: ✓
- Polish MEPs prioritized: ✓
- Balanced representation: ✓
- JSON format correct: ✓

---

## Implementation Code

### Python SDK Integration

````python
# scripts/processors/ai_processor.py

import anthropic
import json
from typing import Dict, List, Optional
from tenacity import retry, stop_after_attempt, wait_exponential

class AIProcessor:
    """Process votes through Claude API"""

    def __init__(self, api_key: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.sonnet_model = "claude-sonnet-4-20250514"
        self.haiku_model = "claude-haiku-4-5-20251001"

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    def generate_context(self, vote_data: Dict) -> str:
        """Generate context explanation using Sonnet"""

        user_prompt = create_context_prompt(vote_data)

        message = self.client.messages.create(
            model=self.sonnet_model,
            max_tokens=1000,
            temperature=0.3,  # Lower = more consistent
            system=CONTEXT_EXPLANATION_SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )

        context = message.content[0].text.strip()

        # Validate length
        word_count = len(context.split())
        if word_count > 200:
            # Too long, truncate or regenerate
            context = ' '.join(context.split()[:150]) + '...'

        return context

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    def score_poland_relevance(self, vote_data: Dict, context: str) -> Dict:
        """Score Poland relevance using Haiku"""

        user_prompt = create_poland_relevance_prompt(vote_data, context)

        message = self.client.messages.create(
            model=self.haiku_model,
            max_tokens=500,
            temperature=0.1,  # Very low = more deterministic
            system=POLAND_RELEVANCE_SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )

        response_text = message.content[0].text.strip()

        # Parse JSON response
        try:
            # Remove markdown code blocks if present
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]

            result = json.loads(response_text)

            # Validate structure
            assert 'stars' in result
            assert 1 <= result['stars'] <= 5
            assert 'reasoning' in result
            assert isinstance(result['reasoning'], list)

            return result

        except (json.JSONDecodeError, AssertionError) as e:
            # Fallback: try to extract stars from text
            import re
            stars_match = re.search(r'(\d)\s*(?:star|gwiazdek)', response_text)
            if stars_match:
                return {
                    'stars': int(stars_match.group(1)),
                    'reasoning': ['Parsing failed, manual review needed'],
                    'confidence': 'low'
                }
            raise ValueError(f"Failed to parse AI response: {e}")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    def extract_arguments(self, vote_data: Dict) -> Optional[Dict]:
        """Extract arguments using Haiku (only if transcript available)"""

        user_prompt = create_arguments_prompt(vote_data)

        if user_prompt is None:
            # No transcript available
            return None

        message = self.client.messages.create(
            model=self.haiku_model,
            max_tokens=1500,
            temperature=0.2,
            system=ARGUMENTS_EXTRACTION_SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )

        response_text = message.content[0].text.strip()

        # Parse JSON
        try:
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]

            result = json.loads(response_text)

            # Validate structure
            assert 'arguments_for' in result
            assert 'arguments_against' in result

            return result

        except (json.JSONDecodeError, AssertionError) as e:
            # Return empty if parsing fails
            return {
                'arguments_for': [],
                'arguments_against': [],
                'debate_summary': 'Parsing failed'
            }

    def process_vote(self, vote_data: Dict) -> Dict:
        """Process a single vote through all AI steps"""

        enriched = {**vote_data}

        try:
            # Step 1: Generate context (Sonnet)
            enriched['context_ai'] = self.generate_context(vote_data)

            # Step 2: Score Poland relevance (Haiku)
            relevance = self.score_poland_relevance(vote_data, enriched['context_ai'])
            enriched['stars_poland'] = relevance['stars']
            enriched['stars_reasoning'] = relevance['reasoning']
            enriched['stars_confidence'] = relevance.get('confidence', 'medium')

            # Step 3: Extract arguments (Haiku, optional)
            arguments = self.extract_arguments(vote_data)
            if arguments:
                enriched['arguments_for'] = arguments['arguments_for']
                enriched['arguments_against'] = arguments['arguments_against']
                enriched['debate_summary'] = arguments.get('debate_summary', '')

            return enriched

        except Exception as e:
            # Log error but don't fail completely
            print(f"AI processing failed for vote {vote_data.get('vote_number')}: {e}")

            # Return vote with error markers
            enriched['ai_processing_failed'] = True
            enriched['ai_error'] = str(e)
            return enriched
````

### Batch Processing

```python
# scripts/processors/batch_processor.py

from concurrent.futures import ThreadPoolExecutor, as_completed
import time
from typing import List, Dict

def process_votes_batch(
    votes: List[Dict],
    ai_processor: AIProcessor,
    batch_size: int = 50,
    max_workers: int = 10
) -> List[Dict]:
    """Process votes in batches with parallelization"""

    enriched_votes = []
    total = len(votes)

    # Process in batches to respect rate limits
    for i in range(0, total, batch_size):
        batch = votes[i:i+batch_size]

        print(f"Processing batch {i//batch_size + 1}/{(total + batch_size - 1)//batch_size}")
        print(f"Votes {i+1}-{min(i+batch_size, total)} of {total}")

        # Process batch in parallel
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all votes in batch
            future_to_vote = {
                executor.submit(ai_processor.process_vote, vote): vote
                for vote in batch
            }

            # Collect results as they complete
            for future in as_completed(future_to_vote):
                try:
                    enriched = future.result()
                    enriched_votes.append(enriched)
                except Exception as e:
                    vote = future_to_vote[future]
                    print(f"Failed to process vote {vote.get('vote_number')}: {e}")

        # Rate limit: wait between batches
        # Claude API: 50 requests per minute
        if i + batch_size < total:
            print("Waiting 60s before next batch (rate limiting)...")
            time.sleep(60)

    return enriched_votes
```

---

## Cost Optimization Strategies

### 1. Caching Context

```python
# Cache context per vote (reuse for all 53 MEPs)

from functools import lru_cache

@lru_cache(maxsize=200)
def get_cached_context(vote_number: str, title: str) -> str:
    """Cache context by vote number to avoid regenerating for each MEP"""
    # Generate once, use for all MEPs voting on this
    return ai_processor.generate_context(vote_data)

# Usage:
for mep_vote in mep_votes_for_this_vote:
    context = get_cached_context(
        vote_data['vote_number'],
        vote_data['title']
    )
    # Reuse same context for all MEPs
```

**Savings:** 150 votes × 52 MEPs = 7,800 fewer API calls = **~$150/month saved**

---

### 2. Skip Arguments When No Transcript

```python
def process_vote_smart(vote_data: Dict) -> Dict:
    """Only call arguments extraction if transcript exists"""

    enriched = vote_data.copy()

    # Always do context and relevance
    enriched['context_ai'] = ai_processor.generate_context(vote_data)
    relevance = ai_processor.score_poland_relevance(vote_data, enriched['context_ai'])
    enriched['stars_poland'] = relevance['stars']

    # Only do arguments if transcript available
    if vote_data.get('debate_transcript'):
        arguments = ai_processor.extract_arguments(vote_data)
        enriched['arguments_for'] = arguments['arguments_for']
        enriched['arguments_against'] = arguments['arguments_against']
    else:
        # Skip this API call
        enriched['arguments_for'] = []
        enriched['arguments_against'] = []

    return enriched
```

**Savings:** ~70% of votes don't have transcripts = **~$2/month saved**

---

### 3. Use Haiku for Simple Tasks

```python
# Use cheaper Haiku model for:
# - Poland relevance scoring (structured output)
# - Arguments extraction (pattern matching)

# Use Sonnet only for:
# - Context explanation (quality-critical, user-facing)

# Cost comparison:
# Sonnet: $3 input + $15 output per 1M tokens
# Haiku:  $1 input + $5 output per 1M tokens (5x cheaper)
```

**Savings:** Using Haiku for 2/3 tasks = **~$4/month saved**

---

### 4. Lower Temperature for Consistency

```python
# Lower temperature = more deterministic = can cache more

ai_processor.generate_context(
    vote_data,
    temperature=0.3  # vs 1.0 default
)

# Benefits:
# - More consistent outputs
# - Better caching hit rate
# - Fewer "creative" but wrong answers
```

---

### 5. Batch API Calls

```python
# Instead of: 150 sequential API calls
# Do: 3 batches of 50 parallel calls

# Benefits:
# - Faster (30 min vs 2.5 hours)
# - No extra cost (same tokens)
# - Respect rate limits (50 RPM)
```

---

## Quality Assurance

### Validation Checks

```python
def validate_ai_output(enriched_vote: Dict) -> bool:
    """Validate AI-generated content"""

    issues = []

    # Check 1: Context length
    context = enriched_vote.get('context_ai', '')
    word_count = len(context.split())
    if word_count < 50 or word_count > 200:
        issues.append(f"Context length out of range: {word_count} words")

    # Check 2: Stars in valid range
    stars = enriched_vote.get('stars_poland')
    if stars is None or not (1 <= stars <= 5):
        issues.append(f"Invalid stars: {stars}")

    # Check 3: Reasoning provided
    reasoning = enriched_vote.get('stars_reasoning', [])
    if not reasoning or len(reasoning) < 2:
        issues.append("Insufficient reasoning for stars")

    # Check 4: Context mentions Poland (if 4-5 stars)
    if stars >= 4:
        context_lower = context.lower()
        if 'polska' not in context_lower and 'poland' not in context_lower:
            issues.append(f"High stars ({stars}) but Poland not mentioned in context")

    # Check 5: Arguments balance (if extracted)
    args_for = enriched_vote.get('arguments_for', [])
    args_against = enriched_vote.get('arguments_against', [])
    if args_for or args_against:
        # Should have arguments on both sides
        if len(args_for) == 0 or len(args_against) == 0:
            issues.append("Unbalanced arguments (only one side)")

    if issues:
        for issue in issues:
            print(f"⚠️  Validation issue: {issue}")
        return False

    return True
```

### Manual Spot Checks

```python
# Sample 5% of votes for manual review

import random

def sample_for_review(enriched_votes: List[Dict], sample_rate: float = 0.05):
    """Sample votes for manual quality check"""

    sample_size = max(1, int(len(enriched_votes) * sample_rate))
    sample = random.sample(enriched_votes, sample_size)

    # Save to file for manual review
    import json
    with open('data/review/ai_quality_sample.json', 'w') as f:
        json.dump(sample, f, indent=2, ensure_ascii=False)

    print(f"Sampled {sample_size} votes for manual review")
    print("Review file: data/review/ai_quality_sample.json")
```

### Quality Metrics

```python
def calculate_quality_metrics(enriched_votes: List[Dict]) -> Dict:
    """Calculate quality metrics for AI outputs"""

    metrics = {
        'total_votes': len(enriched_votes),
        'context_avg_length': 0,
        'stars_distribution': {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
        'validation_pass_rate': 0,
        'arguments_available_rate': 0
    }

    valid_count = 0
    args_count = 0
    total_words = 0

    for vote in enriched_votes:
        # Context length
        total_words += len(vote.get('context_ai', '').split())

        # Stars distribution
        stars = vote.get('stars_poland')
        if stars:
            metrics['stars_distribution'][stars] += 1

        # Validation
        if validate_ai_output(vote):
            valid_count += 1

        # Arguments
        if vote.get('arguments_for') or vote.get('arguments_against'):
            args_count += 1

    metrics['context_avg_length'] = total_words / len(enriched_votes)
    metrics['validation_pass_rate'] = valid_count / len(enriched_votes)
    metrics['arguments_available_rate'] = args_count / len(enriched_votes)

    return metrics

# Usage
metrics = calculate_quality_metrics(enriched_votes)
print(json.dumps(metrics, indent=2))
```

---

## Testing Strategy

### Unit Tests

```python
# tests/test_ai_prompts.py

import pytest
from scripts.processors.ai_processor import AIProcessor

@pytest.fixture
def ai_processor():
    return AIProcessor(api_key="test_key")

def test_context_prompt_generation():
    """Test context prompt is properly formatted"""
    vote_data = {
        'title': 'Test Vote',
        'date': '2024-11-12',
        'result': 'ADOPTED'
    }

    prompt = create_context_prompt(vote_data)

    assert 'TYTUŁ: Test Vote' in prompt
    assert 'DATA GŁOSOWANIA: 2024-11-12' in prompt
    assert 'Przyjęto' in prompt

def test_context_length_validation():
    """Test context is properly validated"""
    context = "Short text"
    assert not validate_context_length(context)  # Too short

    context = " ".join(["word"] * 100)
    assert validate_context_length(context)  # Good length

    context = " ".join(["word"] * 300)
    assert not validate_context_length(context)  # Too long

def test_stars_validation():
    """Test stars are in valid range"""
    assert validate_stars(3) == True
    assert validate_stars(0) == False
    assert validate_stars(6) == False
    assert validate_stars(None) == False

@pytest.mark.integration
def test_real_api_call():
    """Integration test with real API (run sparingly)"""
    ai = AIProcessor(api_key=os.getenv('ANTHROPIC_API_KEY'))

    vote_data = {
        'title': 'Test budget vote',
        'document_summary': 'Budget proposal for 2025...',
        'date': '2024-11-12',
        'result': 'ADOPTED'
    }

    context = ai.generate_context(vote_data)

    assert context
    assert len(context.split()) < 200
    assert 'budżet' in context.lower() or 'budget' in context.lower()
```

---

## Monitoring & Costs

### Track API Usage

```python
# scripts/utils/api_monitor.py

import time
from datetime import datetime

class APIMonitor:
    """Monitor API usage and costs"""

    def __init__(self):
        self.calls = {
            'sonnet': {'count': 0, 'tokens_in': 0, 'tokens_out': 0},
            'haiku': {'count': 0, 'tokens_in': 0, 'tokens_out': 0}
        }
        self.start_time = time.time()

    def log_call(self, model: str, tokens_in: int, tokens_out: int):
        """Log an API call"""
        model_key = 'sonnet' if 'sonnet' in model else 'haiku'
        self.calls[model_key]['count'] += 1
        self.calls[model_key]['tokens_in'] += tokens_in
        self.calls[model_key]['tokens_out'] += tokens_out

    def get_cost_estimate(self) -> Dict:
        """Calculate estimated cost"""
        costs = {
            'sonnet': {
                'input': self.calls['sonnet']['tokens_in'] / 1_000_000 * 3,
                'output': self.calls['sonnet']['tokens_out'] / 1_000_000 * 15
            },
            'haiku': {
                'input': self.calls['haiku']['tokens_in'] / 1_000_000 * 1,
                'output': self.calls['haiku']['tokens_out'] / 1_000_000 * 5
            }
        }

        total_cost = (
            costs['sonnet']['input'] + costs['sonnet']['output'] +
            costs['haiku']['input'] + costs['haiku']['output']
        )

        return {
            'sonnet_calls': self.calls['sonnet']['count'],
            'haiku_calls': self.calls['haiku']['count'],
            'sonnet_cost': costs['sonnet']['input'] + costs['sonnet']['output'],
            'haiku_cost': costs['haiku']['input'] + costs['haiku']['output'],
            'total_cost': total_cost,
            'duration_minutes': (time.time() - self.start_time) / 60
        }

    def print_summary(self):
        """Print cost summary"""
        summary = self.get_cost_estimate()

        print("\n" + "="*60)
        print("AI PROCESSING SUMMARY")
        print("="*60)
        print(f"Duration: {summary['duration_minutes']:.1f} minutes")
        print(f"\nAPI Calls:")
        print(f"  Sonnet: {summary['sonnet_calls']}")
        print(f"  Haiku:  {summary['haiku_calls']}")
        print(f"\nEstimated Costs:")
        print(f"  Sonnet: ${summary['sonnet_cost']:.4f}")
        print(f"  Haiku:  ${summary['haiku_cost']:.4f}")
        print(f"  TOTAL:  ${summary['total_cost']:.4f}")
        print("="*60)

# Usage
monitor = APIMonitor()

# After each API call
response = client.messages.create(...)
monitor.log_call(
    model=model,
    tokens_in=response.usage.input_tokens,
    tokens_out=response.usage.output_tokens
)

# At end
monitor.print_summary()
```

---

## Related Documents

- `PROJECT_OVERVIEW.md` - Project goals
- `TECH_STACK.md` - Why Claude API
- `ARCHITECTURE.md` - Where AI fits in system
- `SCRAPING_STRATEGY.md` - Data that feeds into AI
- `DATABASE_SCHEMA.md` - Where AI output is stored

---

## Future Improvements

### Phase 2 Enhancements

1. **Multi-language Support**

   - Generate context in EN, PL, DE
   - Cost: 3x current (still affordable)

2. **Sentiment Analysis**

   - Analyze tone of speeches
   - Detect patterns in voting

3. **Trend Detection**

   - Track MEP position changes over time
   - Identify voting blocks

4. **Quality Scoring**

   - Rate quality of questions/speeches
   - Identify most active MEPs

5. **Local LLM Option**
   - Run Llama 3 70B locally for some tasks
   - Reduce API dependency

---

## Changes Log

- **2024-12-10 v0.1:** Initial AI prompts documentation

---

_This is a living document. Update prompts based on quality feedback._
