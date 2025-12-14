# SCRAPING_STRATEGY.md

**Status:** Draft  
**Last Updated:** 2024-12-10  
**Owner:** Michał  
**Version:** 0.1

---

## Purpose

Ten dokument opisuje strategię zbierania danych z Parlamentu Europejskiego - jakie źródła używamy, jak często scrapujemy, jak obsługujemy błędy oraz jak walidujemy poprawność danych.

---

## TL;DR

**Frequency:** Raz w miesiącu po sesji plenarnej (20. dnia miesiąca)  
**Duration:** ~30-40 minut całkowity czas  
**Sources:** PE Open Data Portal + oficjalna strona PE  
**Method:** API calls (preferred) + HTML scraping (fallback)  
**Error handling:** Retry logic + manual fallback + alerts

---

## Data Sources Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PRIMARY SOURCES                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. European Parliament Open Data Portal                    │
│     https://data.europarl.europa.eu                         │
│     • SPARQL endpoint                                       │
│     • REST API                                              │
│     • JSON/XML output                                       │
│     • Rate limit: Unknown (be conservative)                 │
│                                                             │
│  2. European Parliament Official Website                    │
│     https://www.europarl.europa.eu                          │
│     • MEP profiles                                          │
│     • Voting results (PDF/XML)                              │
│     • Session documents                                     │
│     • No official API for all data                          │
│                                                             │
│  3. European Parliament Plenary Portal                      │
│     https://www.europarl.europa.eu/plenary                  │
│     • Vote results                                          │
│     • Session agendas                                       │
│     • Minutes                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Scraping Schedule

### Monthly Batch Process

```
Timeline:
┌─────────────────────────────────────────────────────────────┐
│  Day 12-15: Plenary session in Strasbourg                  │
│  (4 days of voting, debates, etc.)                         │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Day 16-19: PE publishes official results                  │
│  (PDFs, XMLs, updates to database)                         │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Day 20: OUR SCRAPER RUNS (GitHub Actions, 2 AM UTC)       │
│  Duration: 30-40 minutes                                    │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Day 20: AI Processing + Database Update                   │
│  Duration: 20-30 minutes                                    │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Day 20: Next.js Rebuild + Deploy                          │
│  Duration: 5-10 minutes                                     │
└────────────────────────┬────────────────────────────────────┘
                         ↓
                    ✓ LIVE ON WEBSITE
```

**Why 20th of the month?**

- Plenary sessions typically mid-month (12-15)
- PE needs 3-5 days to publish official results
- 20th gives buffer for delays
- Not too late in month (users want fresh data)

---

## What We Scrape

### Priority 1: Essential Data (MVP)

#### 1.1 MEPs List (Monthly Update)

```python
# What to scrape:
- List of all 53 Polish MEPs
- Basic info (name, photo, party, EP group)
- Contact details (email, website)
- Committee memberships
- Term dates

# Source:
Primary: https://data.europarl.europa.eu/api/v1/meps?country=POL
Fallback: https://www.europarl.europa.eu/meps/en/search/advanced?countryCode=PL

# Frequency: Monthly (to catch any changes)
# Expected changes: Rare (maybe 1-2 MEPs per year resign/replace)
```

#### 1.2 Voting Sessions (Monthly)

```python
# What to scrape:
- Session metadata (dates, location, type)
- Number of votes in session
- Attendance statistics

# Source:
Primary: https://data.europarl.europa.eu/api/v1/plenary-sessions
Fallback: https://www.europarl.europa.eu/plenary/en/home.html

# Frequency: Monthly
# Expected data: 1 main session + 0-1 mini-sessions per month
```

#### 1.3 Voting Results (Monthly - LARGEST DATASET)

```python
# What to scrape:
- Vote number/ID
- Title (PL + EN)
- Date
- Result (ADOPTED/REJECTED)
- Vote breakdown (FOR/AGAINST/ABSTAIN)
- How each Polish MEP voted
- Document references

# Source:
Primary: https://www.europarl.europa.eu/plenary/en/votes.html
Format: XML files (downloadable)
Alternative: https://data.europarl.europa.eu/api/v1/votes

# Frequency: Monthly
# Expected data: 150-200 votes per session
# Size: ~150 votes × 53 MEPs = 7,950 individual vote records
```

#### 1.4 Attendance Records (Monthly)

```python
# What to scrape:
- Session date
- MEP attendance (present/absent)
- Participation in votes

# Source:
Primary: Embedded in voting results XML
Fallback: https://www.europarl.europa.eu/plenary/en/minutes.html

# Frequency: Monthly
# Expected data: 4 days × 53 MEPs = 212 attendance records per session
```

---

### Priority 2: Extended Data (Post-MVP)

#### 2.1 Parliamentary Questions

```python
# What to scrape:
- Question number
- Subject
- Full text
- Date submitted
- Addressed to (Commission/Council)
- Answer (if available)

# Source:
https://www.europarl.europa.eu/plenary/en/parliamentary-questions.html

# Frequency: Monthly
# Expected data: ~3-5 questions per MEP per month = 150-250 total
```

#### 2.2 Speeches/Interventions

```python
# What to scrape:
- Debate topic
- Date
- Transcript (if available)
- Video URL
- Duration

# Source:
https://www.europarl.europa.eu/plenary/en/debates.html
https://multimedia.europarl.europa.eu

# Frequency: Monthly
# Expected data: ~2-4 speeches per MEP per month = 100-200 total
# Note: Not all speeches have transcripts available
```

---

## Scraping Architecture

### Component Structure

```
scripts/
├── scrapers/
│   ├── __init__.py
│   ├── base.py              # Base scraper class
│   ├── meps.py              # MEP list scraper
│   ├── sessions.py          # Plenary sessions scraper
│   ├── votes.py             # Voting results scraper (largest)
│   ├── attendance.py        # Attendance scraper
│   ├── questions.py         # Questions scraper
│   └── speeches.py          # Speeches scraper
│
├── processors/
│   ├── __init__.py
│   ├── validator.py         # Data validation
│   ├── transformer.py       # Data transformation
│   └── deduplicator.py      # Remove duplicates
│
├── utils/
│   ├── __init__.py
│   ├── http_client.py       # HTTP requests with retry
│   ├── xml_parser.py        # XML parsing helpers
│   ├── rate_limiter.py      # Rate limiting
│   └── logger.py            # Logging setup
│
└── main.py                  # Orchestration script
```

---

## Implementation Details

### Base Scraper Class

```python
# scripts/scrapers/base.py

import requests
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List
from tenacity import retry, stop_after_attempt, wait_exponential

class BaseScraper(ABC):
    """Base class for all scrapers with common functionality"""

    def __init__(self, base_url: str, rate_limit_seconds: float = 1.0):
        self.base_url = base_url
        self.rate_limit = rate_limit_seconds
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'EuroposłowieInfo/1.0 (contact@europosłowie.info)'
        })

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    def fetch(self, url: str, params: Dict = None) -> requests.Response:
        """Fetch URL with retry logic"""
        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()

            # Rate limiting
            time.sleep(self.rate_limit)

            return response
        except requests.RequestException as e:
            self.log_error(f"Failed to fetch {url}: {e}")
            raise

    @abstractmethod
    def scrape(self) -> List[Dict[str, Any]]:
        """Main scraping logic - must be implemented by subclasses"""
        pass

    @abstractmethod
    def validate(self, data: List[Dict]) -> List[Dict]:
        """Validate scraped data - must be implemented by subclasses"""
        pass

    def log_info(self, message: str):
        """Log info message"""
        # Implementation with proper logging
        pass

    def log_error(self, message: str):
        """Log error message"""
        # Implementation with proper logging + alerting
        pass
```

---

### MEPs Scraper

```python
# scripts/scrapers/meps.py

from .base import BaseScraper
from typing import List, Dict, Any

class MEPsScraper(BaseScraper):
    """Scraper for Polish MEPs list"""

    def __init__(self):
        super().__init__(
            base_url="https://data.europarl.europa.eu/api/v1",
            rate_limit_seconds=1.0
        )

    def scrape(self) -> List[Dict[str, Any]]:
        """Scrape list of Polish MEPs"""
        self.log_info("Starting MEPs scraping...")

        # Try primary source (API)
        try:
            return self._scrape_from_api()
        except Exception as e:
            self.log_error(f"API failed: {e}, falling back to HTML scraping")
            return self._scrape_from_html()

    def _scrape_from_api(self) -> List[Dict[str, Any]]:
        """Scrape from official API"""
        response = self.fetch(
            f"{self.base_url}/meps",
            params={"country": "POL", "term": "10"}
        )

        data = response.json()
        meps = []

        for item in data.get('data', []):
            mep = {
                'ep_id': item['id'],
                'full_name': item['label'],
                'first_name': item.get('givenName'),
                'last_name': item.get('familyName'),
                'national_party': self._extract_party(item),
                'ep_group': item.get('politicalGroup', {}).get('label'),
                'email': item.get('email'),
                'photo_url': item.get('img'),
                'term_start': item.get('mandateStartDate'),
                'term_end': item.get('mandateEndDate'),
                'is_active': item.get('isActive', True)
            }
            meps.append(mep)

        self.log_info(f"Scraped {len(meps)} MEPs from API")
        return meps

    def _scrape_from_html(self) -> List[Dict[str, Any]]:
        """Fallback: scrape from HTML page"""
        url = "https://www.europarl.europa.eu/meps/en/search/advanced"
        response = self.fetch(url, params={"countryCode": "PL"})

        # BeautifulSoup parsing logic here
        # ... implementation details

        return meps

    def validate(self, data: List[Dict]) -> List[Dict]:
        """Validate MEP data"""
        valid_meps = []

        for mep in data:
            # Required fields
            if not mep.get('ep_id'):
                self.log_error(f"Missing ep_id for MEP: {mep.get('full_name')}")
                continue

            if not mep.get('full_name'):
                self.log_error(f"Missing full_name for MEP ID: {mep.get('ep_id')}")
                continue

            # Validate EP ID format (positive integer)
            if not isinstance(mep['ep_id'], int) or mep['ep_id'] <= 0:
                self.log_error(f"Invalid ep_id: {mep['ep_id']}")
                continue

            # Generate slug if missing
            if not mep.get('slug'):
                mep['slug'] = self._generate_slug(mep['full_name'])

            valid_meps.append(mep)

        self.log_info(f"Validated {len(valid_meps)}/{len(data)} MEPs")
        return valid_meps

    def _generate_slug(self, full_name: str) -> str:
        """Generate URL-friendly slug from name"""
        import re
        slug = full_name.lower()
        slug = re.sub(r'[^a-z0-9]+', '-', slug)
        slug = slug.strip('-')
        return slug

    def _extract_party(self, item: Dict) -> str:
        """Extract national party from various possible fields"""
        # Implementation depends on API response structure
        return item.get('nationalParty', {}).get('label', 'Unknown')
```

---

### Votes Scraper (Most Complex)

```python
# scripts/scrapers/votes.py

from .base import BaseScraper
import xml.etree.ElementTree as ET
from typing import List, Dict, Any
from datetime import datetime

class VotesScraper(BaseScraper):
    """Scraper for voting results - largest dataset"""

    def __init__(self):
        super().__init__(
            base_url="https://www.europarl.europa.eu/plenary/en",
            rate_limit_seconds=2.0  # More conservative
        )

    def scrape(self, year: int, month: int) -> List[Dict[str, Any]]:
        """
        Scrape votes for a specific month

        Args:
            year: Year (e.g. 2024)
            month: Month (1-12)

        Returns:
            List of vote records
        """
        self.log_info(f"Starting votes scraping for {year}-{month:02d}")

        # Step 1: Get list of sessions in this month
        sessions = self._get_sessions_for_month(year, month)

        if not sessions:
            self.log_error(f"No sessions found for {year}-{month:02d}")
            return []

        # Step 2: For each session, get voting results
        all_votes = []
        for session in sessions:
            session_votes = self._scrape_session_votes(session)
            all_votes.extend(session_votes)

        self.log_info(f"Scraped {len(all_votes)} votes for {year}-{month:02d}")
        return all_votes

    def _get_sessions_for_month(self, year: int, month: int) -> List[str]:
        """Get list of session IDs for a given month"""
        # Query sessions calendar
        url = f"{self.base_url}/meetings-search.html"
        response = self.fetch(url, params={
            'year': year,
            'month': month
        })

        # Parse HTML to extract session IDs
        # Implementation depends on actual HTML structure
        # Example: ['2024-11-I', '2024-11-II']

        return session_ids

    def _scrape_session_votes(self, session_id: str) -> List[Dict[str, Any]]:
        """Scrape all votes from a single session"""
        self.log_info(f"Scraping votes for session {session_id}")

        # Step 1: Download voting results XML
        xml_url = self._get_voting_results_xml_url(session_id)
        response = self.fetch(xml_url)

        # Step 2: Parse XML
        root = ET.fromstring(response.content)

        votes = []
        for vote_elem in root.findall('.//Vote'):
            vote = self._parse_vote_element(vote_elem, session_id)

            # Step 3: Get individual MEP votes for this vote
            mep_votes = self._parse_mep_votes(vote_elem)

            # Step 4: Create one record per MEP
            for mep_vote in mep_votes:
                vote_record = {
                    **vote,  # Common vote info
                    **mep_vote  # MEP-specific info
                }
                votes.append(vote_record)

        return votes

    def _parse_vote_element(self, elem: ET.Element, session_id: str) -> Dict:
        """Parse common vote information from XML element"""
        return {
            'session_id': session_id,
            'vote_number': elem.get('Identifier'),
            'title': elem.findtext('Title'),
            'date': elem.findtext('Date'),
            'result': elem.findtext('Result'),  # "Adopted" or "Rejected"
            'votes_for': int(elem.findtext('For', 0)),
            'votes_against': int(elem.findtext('Against', 0)),
            'votes_abstain': int(elem.findtext('Abstentions', 0)),
            'document_reference': elem.findtext('Reference')
        }

    def _parse_mep_votes(self, vote_elem: ET.Element) -> List[Dict]:
        """Parse how each MEP voted"""
        mep_votes = []

        for result_elem in vote_elem.findall('.//Result.PoliticalGroup.List'):
            group = result_elem.get('Identifier')
            vote_choice = result_elem.get('Choice')  # "For", "Against", "Abstain"

            for mep_elem in result_elem.findall('.//PoliticalGroup.Member'):
                mep_id = int(mep_elem.get('MepId'))
                mep_name = mep_elem.get('Name')

                # Filter: Only Polish MEPs
                # (We'll match by MEP ID against our database)

                mep_votes.append({
                    'mep_ep_id': mep_id,
                    'mep_name': mep_name,
                    'ep_group': group,
                    'vote_choice': self._normalize_vote_choice(vote_choice)
                })

        return mep_votes

    def _normalize_vote_choice(self, choice: str) -> str:
        """Normalize vote choice to consistent values"""
        mapping = {
            'For': 'FOR',
            '+': 'FOR',
            'Against': 'AGAINST',
            '-': 'AGAINST',
            'Abstain': 'ABSTAIN',
            'Abstention': 'ABSTAIN',
            '0': 'ABSTAIN',
            'Absent': 'ABSENT',
            'Did not vote': 'ABSENT'
        }
        return mapping.get(choice, 'ABSENT')

    def validate(self, data: List[Dict]) -> List[Dict]:
        """Validate vote records"""
        valid_votes = []

        for vote in data:
            # Required fields
            required = ['vote_number', 'title', 'date', 'vote_choice', 'mep_ep_id']
            if not all(vote.get(field) for field in required):
                self.log_error(f"Missing required fields in vote: {vote.get('vote_number')}")
                continue

            # Validate vote choice
            if vote['vote_choice'] not in ['FOR', 'AGAINST', 'ABSTAIN', 'ABSENT']:
                self.log_error(f"Invalid vote choice: {vote['vote_choice']}")
                continue

            # Validate date format
            try:
                datetime.strptime(vote['date'], '%Y-%m-%d')
            except ValueError:
                self.log_error(f"Invalid date format: {vote['date']}")
                continue

            valid_votes.append(vote)

        self.log_info(f"Validated {len(valid_votes)}/{len(data)} votes")
        return valid_votes
```

---

## Error Handling Strategy

### 1. Retry Logic

```python
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)

@retry(
    stop=stop_after_attempt(3),  # Try 3 times
    wait=wait_exponential(multiplier=1, min=4, max=10),  # 4s, 8s, 10s
    retry=retry_if_exception_type(requests.RequestException)
)
def fetch_with_retry(url: str):
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response
```

### 2. Fallback Sources

```python
def scrape_with_fallback():
    """Try primary source, fall back to secondary if fails"""
    try:
        data = scrape_from_api()
        if validate(data):
            return data
    except Exception as e:
        log_error(f"Primary source failed: {e}")

    try:
        data = scrape_from_html()
        if validate(data):
            return data
    except Exception as e:
        log_error(f"Secondary source failed: {e}")

    # Both failed - alert and use cached data
    send_alert("All scraping sources failed!")
    return load_cached_data()
```

### 3. Partial Success Handling

```python
def scrape_all_data():
    """Continue even if some scrapers fail"""
    results = {
        'meps': None,
        'votes': None,
        'questions': None,
        'success': []
    }

    # Try each scraper independently
    scrapers = [
        ('meps', MEPsScraper()),
        ('votes', VotesScraper()),
        ('questions', QuestionsScraper())
    ]

    for name, scraper in scrapers:
        try:
            results[name] = scraper.scrape()
            results['success'].append(name)
            log_info(f"✓ {name} scraping successful")
        except Exception as e:
            log_error(f"✗ {name} scraping failed: {e}")
            send_alert(f"Scraper failed: {name}")
            # Continue with other scrapers

    return results
```

### 4. Data Validation Errors

```python
def validate_and_report(data: List[Dict], data_type: str):
    """Validate data and report issues"""
    valid = []
    invalid = []

    for item in data:
        try:
            validated = validate_item(item)
            valid.append(validated)
        except ValidationError as e:
            invalid.append({
                'item': item,
                'error': str(e)
            })

    # Report validation results
    log_info(f"Validated {len(valid)}/{len(data)} {data_type}")

    if invalid:
        log_error(f"Invalid items: {len(invalid)}")
        # Save invalid items for manual review
        save_invalid_items(invalid, data_type)

    # Alert if too many failures
    if len(invalid) / len(data) > 0.1:  # >10% failure rate
        send_alert(f"High validation failure rate for {data_type}: {len(invalid)}/{len(data)}")

    return valid
```

---

## Rate Limiting

### Strategy

```python
import time
from datetime import datetime, timedelta

class RateLimiter:
    """Rate limiter to avoid overwhelming servers"""

    def __init__(self, calls_per_minute: int = 30):
        self.calls_per_minute = calls_per_minute
        self.min_interval = 60.0 / calls_per_minute
        self.last_call = None

    def wait_if_needed(self):
        """Wait if necessary to respect rate limit"""
        if self.last_call is not None:
            elapsed = time.time() - self.last_call
            if elapsed < self.min_interval:
                sleep_time = self.min_interval - elapsed
                time.sleep(sleep_time)

        self.last_call = time.time()

# Usage
rate_limiter = RateLimiter(calls_per_minute=30)

for url in urls:
    rate_limiter.wait_if_needed()
    response = requests.get(url)
```

**Conservative defaults:**

- 30 requests per minute (one every 2 seconds)
- Can increase if no issues
- Decrease if getting rate limited

---

## Data Validation

### Validation Rules

```python
from pydantic import BaseModel, Field, validator
from datetime import date

class VoteRecord(BaseModel):
    """Schema for vote record validation"""

    vote_number: str = Field(..., min_length=1)
    title: str = Field(..., min_length=5, max_length=500)
    date: date
    vote_choice: str = Field(..., regex=r'^(FOR|AGAINST|ABSTAIN|ABSENT)$')
    mep_ep_id: int = Field(..., gt=0)
    result: str = Field(..., regex=r'^(ADOPTED|REJECTED|TIED)$')

    @validator('date')
    def date_not_future(cls, v):
        if v > date.today():
            raise ValueError('Vote date cannot be in future')
        return v

    @validator('date')
    def date_not_too_old(cls, v):
        # Votes should be from current term (2024+)
        if v.year < 2024:
            raise ValueError('Vote date too old')
        return v

# Usage
try:
    validated = VoteRecord(**raw_data)
except ValidationError as e:
    log_error(f"Validation failed: {e}")
```

### Consistency Checks

```python
def check_data_consistency(votes: List[Dict]):
    """Check for logical inconsistencies in data"""
    issues = []

    # Check 1: Total votes should match breakdown
    for vote in votes:
        if vote.get('votes_for') and vote.get('votes_against'):
            total_declared = (
                vote.get('votes_for', 0) +
                vote.get('votes_against', 0) +
                vote.get('votes_abstain', 0)
            )

            # Count individual MEP votes
            mep_votes = [v for v in votes if v['vote_number'] == vote['vote_number']]
            total_counted = len([v for v in mep_votes if v['vote_choice'] != 'ABSENT'])

            # Allow some discrepancy (some MEPs not in our database)
            if abs(total_declared - total_counted) > 10:
                issues.append(f"Vote {vote['vote_number']}: Mismatch in totals")

    # Check 2: No duplicate votes (same MEP, same vote)
    seen = set()
    for vote in votes:
        key = (vote['mep_ep_id'], vote['vote_number'])
        if key in seen:
            issues.append(f"Duplicate vote: MEP {vote['mep_ep_id']}, Vote {vote['vote_number']}")
        seen.add(key)

    # Check 3: All referenced MEPs exist in our database
    # (This check happens during database insertion)

    if issues:
        log_error(f"Found {len(issues)} consistency issues")
        for issue in issues:
            log_error(f"  - {issue}")

    return len(issues) == 0
```

---

## Caching Strategy

### Why Cache?

- **Avoid re-scraping** unchanged data (MEPs list)
- **Resume from failure** (if scraper crashes midway)
- **Development/testing** (don't hit live servers constantly)

### Implementation

```python
import json
import hashlib
from pathlib import Path
from datetime import datetime, timedelta

class ScraperCache:
    """Simple file-based cache for scraped data"""

    def __init__(self, cache_dir: str = "data/cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def get(self, key: str, max_age_hours: int = 24):
        """Get cached data if not expired"""
        cache_file = self.cache_dir / f"{key}.json"

        if not cache_file.exists():
            return None

        # Check age
        file_age = datetime.now() - datetime.fromtimestamp(cache_file.stat().st_mtime)
        if file_age > timedelta(hours=max_age_hours):
            return None

        with open(cache_file, 'r') as f:
            return json.load(f)

    def set(self, key: str, data: Any):
        """Save data to cache"""
        cache_file = self.cache_dir / f"{key}.json"

        with open(cache_file, 'w') as f:
            json.dump(data, f, indent=2, default=str)

    def invalidate(self, key: str):
        """Delete cached data"""
        cache_file = self.cache_dir / f"{key}.json"
        if cache_file.exists():
            cache_file.unlink()

# Usage
cache = ScraperCache()

def scrape_meps():
    # Try cache first
    cached = cache.get('meps', max_age_hours=168)  # 1 week
    if cached:
        log_info("Using cached MEPs data")
        return cached

    # Scrape fresh data
    scraper = MEPsScraper()
    data = scraper.scrape()

    # Cache for next time
    cache.set('meps', data)

    return data
```

---

## Monitoring & Alerting

### What to Monitor

```python
class ScraperMetrics:
    """Track scraper performance and issues"""

    def __init__(self):
        self.metrics = {
            'start_time': None,
            'end_time': None,
            'duration_seconds': 0,
            'items_scraped': 0,
            'items_valid': 0,
            'items_invalid': 0,
            'errors': [],
            'http_requests': 0,
            'http_errors': 0,
            'retry_count': 0
        }

    def record_error(self, error: str):
        self.metrics['errors'].append({
            'timestamp': datetime.now().isoformat(),
            'message': error
        })

    def summary(self) -> Dict:
        """Get summary of scraping session"""
        return {
            'duration': self.metrics['duration_seconds'],
            'success_rate': self.metrics['items_valid'] / max(self.metrics['items_scraped'], 1),
            'error_count': len(self.metrics['errors']),
            'http_error_rate': self.metrics['http_errors'] / max(self.metrics['http_requests'], 1)
        }

# Usage
metrics = ScraperMetrics()
metrics.start_time = datetime.now()

# ... scraping logic ...

metrics.end_time = datetime.now()
metrics.duration_seconds = (metrics.end_time - metrics.start_time).total_seconds()

# Send summary
send_metrics_to_monitoring(metrics.summary())
```

### Alert Conditions

```python
def check_and_alert(metrics: ScraperMetrics):
    """Send alerts based on metrics"""
    summary = metrics.summary()

    # Critical: Scraper failed completely
    if summary['success_rate'] == 0:
        send_alert(
            level="CRITICAL",
            message="Scraper failed completely - no valid data",
            details=metrics.summary()
        )

    # Warning: Low success rate
    elif summary['success_rate'] < 0.9:
        send_alert(
            level="WARNING",
            message=f"Low success rate: {summary['success_rate']:.1%}",
            details=metrics.summary()
        )

    # Warning: High error rate
    if summary['error_count'] > 10:
        send_alert(
            level="WARNING",
            message=f"High error count: {summary['error_count']}",
            details=metrics.metrics['errors']
        )

    # Warning: Took too long
    if summary['duration'] > 3600:  # 1 hour
        send_alert(
            level="WARNING",
            message=f"Scraper took {summary['duration']/60:.1f} minutes",
            details=metrics.summary()
        )

    # Info: Success
    else:
        log_info("✓ Scraping completed successfully")
        log_info(f"Duration: {summary['duration']:.1f}s, Success rate: {summary['success_rate']:.1%}")
```

---

## Orchestration Script

### Main Script

```python
# scripts/main.py

import sys
from datetime import datetime
from scrapers import MEPsScraper, VotesScraper, QuestionsScraper
from processors import Validator, Transformer
from utils import logger, send_alert

def main():
    """Main orchestration script"""
    logger.info("=" * 60)
    logger.info("Starting monthly data collection")
    logger.info(f"Date: {datetime.now().isoformat()}")
    logger.info("=" * 60)

    results = {
        'success': False,
        'scrapers': {},
        'errors': []
    }

    try:
        # Step 1: Scrape MEPs (quick, rarely changes)
        logger.info("Step 1/3: Scraping MEPs list...")
        meps_scraper = MEPsScraper()
        meps = meps_scraper.scrape()
        meps = meps_scraper.validate(meps)
        results['scrapers']['meps'] = {
            'count': len(meps),
            'success': True
        }
        logger.info(f"✓ MEPs: {len(meps)} records")

        # Step 2: Scrape Votes (largest dataset)
        logger.info("Step 2/3: Scraping voting results...")
        votes_scraper = VotesScraper()
        year, month = get_previous_month()
        votes = votes_scraper.scrape(year, month)
        votes = votes_scraper.validate(votes)
        results['scrapers']['votes'] = {
            'count': len(votes),
            'success': True
        }
        logger.info(f"✓ Votes: {len(votes)} records")

        # Step 3: Scrape Questions (optional)
        logger.info("Step 3/3: Scraping parliamentary questions...")
        try:
            questions_scraper = QuestionsScraper()
            questions = questions_scraper.scrape(year, month)
            questions = questions_scraper.validate(questions)
            results['scrapers']['questions'] = {
                'count': len(questions),
                'success': True
            }
            logger.info(f"✓ Questions: {len(questions)} records")
        except Exception as e:
            logger.warning(f"Questions scraping failed (non-critical): {e}")
            results['scrapers']['questions'] = {
                'success': False,
                'error': str(e)
            }

        # Success
        results['success'] = True
        logger.info("=" * 60)
        logger.info("✓ Scraping completed successfully")
        logger.info("=" * 60)

        # Save results for next step (AI processing)
        save_results(results, meps, votes, questions)

        return 0  # Exit code 0 = success

    except Exception as e:
        logger.error(f"✗ Critical error: {e}", exc_info=True)
        results['errors'].append(str(e))
        send_alert(
            level="CRITICAL",
            message="Scraping failed with critical error",
            details={'error': str(e), 'results': results}
        )
        return 1  # Exit code 1 = failure

def get_previous_month():
    """Get year and month of previous month"""
    today = datetime.now()
    if today.month == 1:
        return today.year - 1, 12
    else:
        return today.year, today.month - 1

def save_results(results, meps, votes, questions):
    """Save scraped data to files for next processing step"""
    from pathlib import Path
    import json

    output_dir = Path("data/raw")
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Save each dataset
    with open(output_dir / f"meps_{timestamp}.json", 'w') as f:
        json.dump(meps, f, indent=2, default=str)

    with open(output_dir / f"votes_{timestamp}.json", 'w') as f:
        json.dump(votes, f, indent=2, default=str)

    with open(output_dir / f"questions_{timestamp}.json", 'w') as f:
        json.dump(questions, f, indent=2, default=str)

    # Save metadata
    with open(output_dir / f"metadata_{timestamp}.json", 'w') as f:
        json.dump(results, f, indent=2, default=str)

    logger.info(f"Saved results to {output_dir}")

if __name__ == "__main__":
    sys.exit(main())
```

---

## GitHub Actions Workflow

```yaml
# .github/workflows/scrape-monthly.yml

name: Monthly Data Collection

on:
  schedule:
    # Run on 20th of every month at 2 AM UTC
    - cron: '0 2 20 * *'

  # Allow manual trigger
  workflow_dispatch:

jobs:
  scrape:
    runs-on: ubuntu-latest
    timeout-minutes: 60 # Kill if takes >1 hour

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt

      - name: Run scrapers
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          python scripts/main.py

      - name: Upload artifacts (on failure)
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: scraping-logs
          path: logs/

      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Monthly scraping failed!'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Testing Strategy

### Unit Tests

```python
# tests/test_scrapers.py

import pytest
from scripts.scrapers import MEPsScraper, VotesScraper

def test_meps_scraper_validation():
    """Test MEP data validation"""
    scraper = MEPsScraper()

    # Valid data
    valid_mep = {
        'ep_id': 12345,
        'full_name': 'Jan Kowalski',
        'national_party': 'PiS'
    }
    assert scraper.validate([valid_mep]) == [valid_mep]

    # Invalid data (missing ep_id)
    invalid_mep = {
        'full_name': 'Anna Nowak'
    }
    assert scraper.validate([invalid_mep]) == []

def test_vote_choice_normalization():
    """Test vote choice normalization"""
    scraper = VotesScraper()

    assert scraper._normalize_vote_choice('For') == 'FOR'
    assert scraper._normalize_vote_choice('+') == 'FOR'
    assert scraper._normalize_vote_choice('Against') == 'AGAINST'
    assert scraper._normalize_vote_choice('-') == 'AGAINST'
    assert scraper._normalize_vote_choice('0') == 'ABSTAIN'
    assert scraper._normalize_vote_choice('Did not vote') == 'ABSENT'

@pytest.mark.integration
def test_meps_scraper_live():
    """Integration test with live API (run sparingly)"""
    scraper = MEPsScraper()
    meps = scraper.scrape()

    assert len(meps) == 53  # 53 Polish MEPs
    assert all('ep_id' in mep for mep in meps)
    assert all('full_name' in mep for mep in meps)
```

### Manual Testing Checklist

```markdown
Before deploying scraper updates:

□ Test with cached data (don't hit live servers)
□ Test with live API (small sample)
□ Verify validation catches bad data
□ Check error handling (simulate failures)
□ Verify rate limiting works
□ Test retry logic
□ Check data consistency
□ Verify all 53 MEPs are captured
□ Check vote totals match PE official numbers
□ Test end-to-end with database insertion
```

---

## Related Documents

- `PROJECT_OVERVIEW.md` - Project goals
- `TECH_STACK.md` - Technology choices
- `ARCHITECTURE.md` - System architecture
- `DATABASE_SCHEMA.md` - Where scraped data goes
- `AI_PROMPTS.md` - Next step after scraping

---

## Future Improvements

### Phase 2 Enhancements

1. **Real-time Updates**

   - WebSocket connection to PE
   - Incremental updates vs full batch
   - Push notifications

2. **Multiple Data Sources**

   - VoteWatch Europe API integration
   - Cross-validation between sources
   - Automatic conflict resolution

3. **Machine Learning**

   - Predict vote outcomes
   - Detect anomalies in voting patterns
   - Automatic categorization (without AI API)

4. **Advanced Monitoring**
   - Grafana dashboards
   - Detailed performance metrics
   - Anomaly detection

---

## Changes Log

- **2024-12-10 v0.1:** Initial scraping strategy documentation

---

_This is a living document. Update as scraping strategy evolves._
