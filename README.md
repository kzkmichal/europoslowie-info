# Europosłowie.info

Platform transparentności politycznej monitorująca aktywność polskich europosłów w Parlamencie Europejskim.

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker (for PostgreSQL)
- Git

### 1. Clone and Install

```bash
git clone <repository-url>
cd europrojekt

# Install Python dependencies
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Install Node dependencies
cd frontend
npm install
cd ..
```

### 2. Set up Database

```bash
# Start PostgreSQL with Docker
docker-compose up -d db

# Or use Docker CLI
docker run -d --name europosel-db \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=europoslowie \
  -p 5432:5432 \
  postgres:15

# Verify database is running
docker ps | grep europosel-db
```

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env.local

# Edit .env.local with your settings
# DATABASE_URL is already set for local Docker PostgreSQL
```

### 4. Run Database Migrations

```bash
# Make sure venv is activated
source venv/bin/activate

# Run migrations
alembic upgrade head
```

Expected output:

```
INFO  [alembic.runtime.migration] Running upgrade -> 001
✓ Migrations completed successfully
```

### 5. Seed Test Data

```bash
python scripts/seed_database.py --minimal
```

Expected output:

```
✓ Created 5 test MEPs
✓ Created 1 test voting session
✓ Created 20 test votes
✓ Created monthly stats
✅ Database seeded successfully!
```

### 6. Verify Setup

```bash
# Connect to database
docker exec -it europosel-db psql -U postgres -d europoslowie

# Run test queries
SELECT COUNT(*) FROM meps;           -- Should return: 5
SELECT COUNT(*) FROM votes;          -- Should return: 20
SELECT * FROM meps LIMIT 1;          -- Should show MEP data

# Exit psql
\q

# Test Drizzle ORM and query functions
cd frontend
npm run db:test          # Test database connection
npm run db:test:queries  # Test all query functions
```

Expected output:
```
✅ Database connection successful
✅ All query tests completed successfully!
```

## Database Schema

The database consists of 7 main tables:

1. **meps** - Polish MEPs (53 in production, 5 in test)
2. **voting_sessions** - Plenary sessions (12-15 per year)
3. **votes** - Individual voting records (largest table)
4. **monthly_stats** - Pre-calculated statistics per MEP
5. **questions** - Parliamentary questions
6. **speeches** - Parliamentary speeches
7. **committee_memberships** - Committee assignments

See `docs/DATABASE_SCHEMA.md` for detailed documentation.

## Development Workflow

### Daily Workflow

```bash
# 1. Start database (if not running)
docker start europosel-db

# 2. Activate Python venv
source venv/bin/activate

# 3. Work on code...

# 4. Run tests
pytest

# 5. Stop database (optional)
docker stop europosel-db
```

### Database Commands

```bash
# Create new migration
alembic revision -m "description of changes"

# Run migrations
alembic upgrade head

# Rollback last migration
alembic downgrade -1

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d db
alembic upgrade head
python scripts/seed_database.py --minimal
```

## Project Structure

```
europrojekt/
├── frontend/              # Next.js 16 application
│   ├── app/               # Next.js App Router pages (to be built)
│   ├── lib/
│   │   └── db/            # Drizzle ORM setup
│   │       ├── index.ts   # Database connection
│   │       ├── schema.ts  # Drizzle schema
│   │       └── queries.ts # Query functions
│   ├── scripts/           # Frontend test scripts
│   │   ├── test-db-connection.ts
│   │   └── test-queries.ts
│   ├── package.json       # Node.js dependencies
│   └── .env.local         # Frontend environment variables
├── scripts/
│   ├── alembic/           # Database migrations
│   │   └── versions/      # Migration files
│   ├── scrapers/          # Data collection scripts
│   ├── processors/        # AI processing
│   └── utils/             # Helper functions
├── data/
│   ├── cache/             # Cached scraping data
│   └── raw/               # Raw scraped data
├── tests/                 # Test files
├── requirements.txt       # Python dependencies
├── .env.example           # Environment variables template
└── docker-compose.yml     # Database setup
```

## Next Steps

- [x] Set up Next.js 16 frontend infrastructure
- [x] Install and configure Drizzle ORM
- [x] Create database schema and query functions
- [ ] Build Next.js frontend pages (data layer ready)
- [ ] Implement Python scrapers (see `docs/SCRAPING_STRATEGY.md`)
- [ ] Configure AI processing (see `docs/AI_PROMPTS.md`)
- [ ] Deploy to Vercel + Supabase

## Documentation

All detailed documentation is in the `docs/` folder (local only, not committed to git):

- **[PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)** - Project goals and scope
- **[TECH_STACK.md](docs/TECH_STACK.md)** - Technology choices and versions
- **[SETUP_GUIDE.md](docs/SETUP_GUIDE.md)** - Detailed setup instructions
- **[DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)** - Database structure
- **[DATA_FETCHING.md](docs/DATA_FETCHING.md)** - Drizzle ORM queries and examples
- **[DATA_CONTRACTS.md](docs/DATA_CONTRACTS.md)** - TypeScript types and contracts
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture
- **[FRONTEND_MVP_STRUCTURE.md](docs/FRONTEND_MVP_STRUCTURE.md)** - Frontend pages structure
- **[SCRAPING_STRATEGY.md](docs/SCRAPING_STRATEGY.md)** - Data collection strategy
- **[AI_PROMPTS.md](docs/AI_PROMPTS.md)** - AI integration and prompts

## Troubleshooting

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker ps | grep europosel-db

# Check DATABASE_URL in .env.local
cat .env.local | grep DATABASE_URL

# Test connection manually
psql postgresql://postgres:dev@localhost:5432/europoslowie
```

### Migration Errors

```bash
# Check current migration status
alembic current

# Show migration history
alembic history

# Reset migrations (if needed)
alembic downgrade base
alembic upgrade head
```

## License

TBD

## Contact

TBD
