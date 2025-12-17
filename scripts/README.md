# Scrapers Documentation

Python scripts for collecting data from the European Parliament.

## Structure

```
scripts/
├── scrapers/           # Scraper modules
│   ├── base.py        # Base scraper class
│   ├── meps.py        # MEPs scraper (53 Polish MEPs)
│   ├── votes.py       # Votes scraper (TODO)
│   └── sessions.py    # Sessions scraper (TODO)
├── utils/              # Utility modules
│   ├── http_client.py # HTTP client with retry logic
│   ├── db.py          # Database connection
│   ├── db_writer.py   # Database writer
│   └── logger.py      # Logging configuration
├── processors/         # AI processing (TODO)
└── alembic/           # Database migrations
```

## Available Scrapers

### 1. MEPs Scraper (`meps.py`)

Scrapes the list of 53 Polish Members of European Parliament.

**Data sources:**
- Primary: European Parliament Open Data Portal API
- Fallback: Official EP website (if API fails)

**Usage:**

```bash
# Activate virtual environment
source venv/bin/activate

# Set environment variables
source setup_env.sh

# Run test script
python scripts/test_meps_scraper.py
```

**What it scrapes:**
- EP ID (unique identifier)
- Full name, first name, last name
- National party (PiS, KO, Lewica, etc.)
- European Parliament group (ECR, EPP, S&D, etc.)
- Email, photo URL, website URL
- Term dates
- Active status

**Output:** Saves to `meps` table in database.

### 2. Votes Scraper (TODO)

Will scrape voting results from plenary sessions.

### 3. Sessions Scraper (TODO)

Will scrape voting session metadata.

## Common Features

All scrapers inherit from `BaseScraper` and include:

✅ **Retry logic** - Automatic retries with exponential backoff
✅ **Rate limiting** - Respects server limits (2s between requests)
✅ **Error handling** - Graceful fallback and error logging
✅ **Validation** - Data quality checks before database insertion
✅ **Statistics** - Success rates and error tracking
✅ **Logging** - Console + file logs (see `logs/` directory)

## Running Scrapers

### Quick Test

```bash
# Test MEPs scraper
python scripts/test_meps_scraper.py
```

### Manual Scraping

```python
from scrapers.meps import MEPsScraper
from utils.db_writer import DatabaseWriter

# Scrape
with MEPsScraper() as scraper:
    meps = scraper.scrape(term=10)
    valid_meps = scraper.validate(meps)

    # Save to database
    DatabaseWriter.upsert_meps(valid_meps)

    # Print summary
    scraper.print_summary()
```

## Environment Variables

Required environment variables (set in `.env.local`):

```bash
DATABASE_URL=postgresql://postgres:dev@localhost:5433/europoslowie
```

Optional (for future features):

```bash
ANTHROPIC_API_KEY=sk-ant-xxxxx  # For AI processing
LOG_LEVEL=DEBUG                  # For verbose logging
```

## Error Handling

Scrapers use a multi-level fallback strategy:

1. **Primary source** (API) - Fast, structured data
2. **Fallback source** (Web scraping) - Slower, less reliable
3. **Mock data** (for testing) - When both sources fail

Errors are logged to:
- Console (INFO level)
- Log file: `logs/scraper_YYYYMMDD.log` (DEBUG level)

## Adding New Scrapers

To create a new scraper:

1. Extend `BaseScraper` class
2. Implement `scrape()` method
3. Implement `validate()` method
4. Add database writer method if needed

Example:

```python
from .base import BaseScraper

class MyNewScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            base_url="https://api.example.com",
            rate_limit_seconds=2.0
        )

    def scrape(self, **kwargs):
        # Scraping logic here
        return data

    def validate(self, data):
        # Validation logic here
        return valid_data
```

## Testing

```bash
# Run all tests (when pytest is configured)
pytest tests/

# Run specific scraper test
python scripts/test_meps_scraper.py
```

## Troubleshooting

### "No MEPs scraped"

This is expected if the EP API is unavailable. The scraper will:
1. Try the API
2. Try web scraping
3. Fall back to mock data for testing

### Database connection errors

Make sure:
- PostgreSQL is running: `docker ps`
- Environment variables are set: `source setup_env.sh`
- Database is migrated: `alembic upgrade head`

### Import errors

Make sure you're in the virtual environment:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

## Next Steps

- [ ] Implement votes scraper
- [ ] Implement sessions scraper
- [ ] Add BeautifulSoup fallback for web scraping
- [ ] Add caching layer
- [ ] Integrate AI processing
- [ ] Add comprehensive tests

## Related Documentation

- `SCRAPING_STRATEGY.md` - Overall scraping strategy
- `DATABASE_SCHEMA.md` - Database structure
- `ARCHITECTURE.md` - System architecture
