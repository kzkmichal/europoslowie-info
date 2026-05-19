# Europosłowie.pl

**Platforma transparentności politycznej** — śledzimy aktywność 53 polskich europosłów w Parlamencie Europejskim.

[![Live](https://img.shields.io/badge/live-europoslowie.pl-blue)](https://europoslowie.pl)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

## O projekcie

Strona umożliwia każdemu obywatelowi sprawdzenie:

- **jak głosował każdy polski europoseł** — wyniki głosowań, frekwencja, historia po sesjach
- **co dane głosowanie oznacza dla Polski** — scoring AI: 🔴 kluczowe / 🟡 istotne / ⚪ neutralne
- **co jest głosowane** — kontekst AI z opisem i kluczowymi punktami, linki do źródeł EP
- **pytania parlamentarne i przemówienia** złożone przez każdego europosła
- **filtrowanie głosowań** po temacie, wyniku, miesiącu i tekście

Dane są pobierane z [EP Open Data API v2](https://data.europarl.europa.eu/api/v2/) i aktualizowane automatycznie co miesiąc przez GitHub Actions.

---

## Tech stack

| Layer    | Technology                                                      |
| -------- | --------------------------------------------------------------- |
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Drizzle ORM               |
| Database | PostgreSQL 15 (Docker locally, Supabase in prod)                |
| Scrapers | Python 3.11, EP Open Data API v2                                |
| AI       | Claude Haiku 4.5 — vote descriptions + Poland relevance scoring |
| Hosting  | Vercel (frontend) + GitHub Actions (monthly scraping)           |

## Data flow

```
EP Open Data API v2
        ↓
  Python scrapers  (scripts/)
        ↓
  PostgreSQL · 9 tables
        ↓
  Drizzle ORM  (frontend/lib/db/)
        ↓
  Next.js ISR  →  Vercel
```

---

## Local development

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker

### 1. Clone and install

```bash
git clone https://github.com/kzkmichal/europrojekt.git
cd europrojekt

# Python dependencies
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Node dependencies
cd frontend && npm install && cd ..
```

### 2. Start database

```bash
docker-compose up -d        # PostgreSQL on port 5433
```

### 3. Environment variables

**`frontend/.env.local`**

```
DATABASE_URL=postgresql://postgres:dev@localhost:5433/europoslowie
```

**`.env`** (backend scrapers)

```
DATABASE_URL=postgresql://postgres:dev@localhost:5433/europoslowie?client_encoding=utf8
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Run migrations and seed

```bash
source venv/bin/activate
alembic upgrade head
python scripts/seed_database.py --minimal
```

### 5. Start dev server

```bash
cd frontend && npm run dev    # http://localhost:3000
```

### Useful commands

```bash
npm run db:test               # Test database connection
npm run db:test:queries       # Test all query functions
npm run db:studio             # Drizzle ORM Studio UI

docker exec -it europosel-db psql -U postgres -d europoslowie
```

---

## Scraping — adding a new month

The full pipeline runs 9 steps in sequence. Example for March 2026:

```bash
source venv/bin/activate

# 1. Scrape sessions and votes
python scripts/run_scrapers.py --year 2026 --month 3 --skip-meps --skip-committees

# 2. Mark representative votes per group
python scripts/populate_representative_votes.py

# 3–5. Populate vote sources (tiers 1–3)
python scripts/populate_vote_sources.py --from-date 2026-03-01
python scripts/populate_vote_sources.py --from-date 2026-03-01 --procedures-only
python scripts/populate_vote_sources.py --from-date 2026-03-01 --summaries-only

# 6. AI vote descriptions (Claude Haiku 4.5, ~$0.03/description)
python scripts/populate_vote_descriptions.py --from-date 2026-03-01

# 7. Topic categories
python scripts/populate_topic_categories.py

# 8. Poland relevance scoring (Claude Haiku 4.5, ~$0.01/vote)
python scripts/populate_poland_relevance.py --from-date 2026-03-01

# 9. Redeploy Vercel to refresh ISR cache (TTL 24h)
git push origin main
```

GitHub Actions runs this automatically on the 20th of each month (`.github/workflows/scrape.yml`).

---

## Project structure

```
europrojekt/
├── frontend/
│   ├── app/                        # Next.js App Router — 7 pages
│   ├── components/
│   │   ├── home/                   # Homepage-specific components
│   │   ├── layout/                 # Header, Footer, Container
│   │   ├── meps/                   # MEPCard, StatsTable, CommitteeList…
│   │   ├── votes/                  # VoteCard, VoteDetail/, VoteSources…
│   │   ├── sessions/               # LastSessionCard, UpcomingSessionCard
│   │   └── ui/                     # shadcn/ui (do not edit manually)
│   └── lib/
│       ├── db/                     # schema.ts · queries.ts · index.ts
│       └── types.ts
├── scripts/
│   ├── scrapers/                   # MEPs, votes, sessions, committees…
│   ├── alembic/versions/           # 15 migrations
│   └── utils/                      # db_writer.py · logger.py
├── docs/                           # Detailed documentation (see below)
├── .github/workflows/scrape.yml    # Monthly automated scraping
└── docker-compose.yml
```

---

## Documentation

Detailed docs live in `docs/`:

| File                           | Contents                                   |
| ------------------------------ | ------------------------------------------ |
| `ARCHITECTURE.md`              | System architecture overview               |
| `DATABASE_SCHEMA.md`           | Full schema — 9 tables, all columns        |
| `SCRAPING_STRATEGY.md`         | Scraper tiers and data sources             |
| `DATA_FETCHING.md`             | Drizzle ORM query patterns                 |
| `AI_PROMPTS.md`                | AI pipeline — prompts, scoring logic, tags |
| `DEPLOYMENT.md`                | Vercel + Supabase production setup         |
| `EP_API_ENDPOINTS_COMPLETE.md` | EP Open Data API v2 reference              |

---

## License

[GNU General Public License v3.0](LICENSE)
