# TECH_STACK.md

**Status:** Draft  
**Last Updated:** 2024-12-10  
**Owner:** Michał  
**Version:** 0.1

---

## Purpose

Ten dokument szczegółowo opisuje wszystkie technologie używane w projekcie Europosłowie.info, uzasadnienia dla każdego wyboru, alternatywy które rozważaliśmy oraz trade-offs.

---

## TL;DR

**Stack Overview:**

- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Backend:** Python 3.11 (scraping/ETL) + Next.js API routes
- **Database:** PostgreSQL 15 (via Supabase)
- **AI:** Anthropic Claude API (Sonnet 4 + Haiku 4.5)
- **Hosting:** Vercel (frontend) + Supabase (DB) + GitHub Actions (automation)
- **Cost:** ~$6-7/month (production)

---

## Architecture Layers

```
┌─────────────────────────────────────────────────┐
│  LAYER 1: DATA SOURCES                          │
│  • Parlament Europejski API                     │
│  • Official PE website (scraping fallback)      │
└──────────────────┬──────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────┐
│  LAYER 2: DATA COLLECTION & ETL                  │
│  • Python 3.11 (requests, BeautifulSoup, pandas)│
│  • GitHub Actions (scheduling)                   │
└──────────────────┬──────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────┐
│  LAYER 3: AI PROCESSING                          │
│  • Claude Sonnet 4 (context explanation)         │
│  • Claude Haiku 4.5 (relevance scoring)          │
└──────────────────┬──────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────┐
│  LAYER 4: DATABASE                               │
│  • PostgreSQL 15 (Supabase managed)              │
│  • SQLAlchemy (ORM)                              │
└──────────────────┬──────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────┐
│  LAYER 5: WEB APPLICATION                        │
│  • Next.js 14 (App Router)                       │
│  • TypeScript + React 18                         │
│  • Tailwind CSS + Radix UI                       │
└──────────────────┬──────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────┐
│  LAYER 6: HOSTING & DELIVERY                     │
│  • Vercel (CDN + Edge Functions)                 │
│  • Vercel Blob (image storage)                   │
└──────────────────────────────────────────────────┘
```

---

## LAYER 1: Data Collection & ETL

### Python 3.11+

**Role:** Scraping, data processing, ETL pipeline

**Why Python:**

```
✅ Best ecosystem for data processing
✅ Excellent libraries for web scraping
✅ Easy to handle XML/JSON/PDF parsing
✅ Great for batch jobs and automation
✅ Mature error handling and retry logic
✅ Easy integration with databases
❌ Slower than Node.js (but irrelevant for batch)
❌ Separate runtime from Next.js
```

**Alternatives considered:**

- **Node.js** - Could unify stack, but worse scraping libs
- **Go** - Faster, but overkill and longer dev time
- **Ruby** - Similar to Python, but smaller ecosystem

**Decision:** Python wins for data processing tasks

---

### Key Python Libraries

#### 1. `requests` v2.31+

```python
import requests

response = requests.get(
    "https://data.europarl.europa.eu/api/v1/meps",
    params={"country": "POL"},
    timeout=30
)
```

**Why:**

- Industry standard (50M+ weekly downloads)
- Excellent documentation
- Built-in session management, retries, timeouts
- Easy authentication handling

**Alternatives:**

- `httpx` - Async support, but overkill for batch jobs
- `urllib` - Built-in, but clunky API

---

#### 2. `BeautifulSoup4` v4.12+ + `lxml` v5.1+

```python
from bs4 import BeautifulSoup

soup = BeautifulSoup(html_content, 'lxml')
votes = soup.find_all('div', class_='vote-result')
```

**Why:**

- Most intuitive HTML parsing API
- Handles broken/malformed HTML gracefully
- lxml backend = fast performance
- Great for extracting structured data

**Alternatives:**

- `Scrapy` - Full framework, too heavy for our needs
- `regex` - Never use for HTML parsing
- `pyquery` - jQuery-like, but less maintained

---

#### 3. `pandas` v2.1+

```python
import pandas as pd

df = pd.DataFrame(votes_data)
df['date'] = pd.to_datetime(df['date'])
df.groupby('mep_id').agg({
    'votes': 'count',
    'attendance': 'mean'
})
```

**Why:**

- Industry standard for tabular data
- SQL-like operations on DataFrames
- Easy data cleaning and transformation
- Built-in export to CSV, JSON, SQL
- Great for calculating aggregates

**Alternatives:**

- `polars` - Faster, but newer and less mature
- Pure Python dicts/lists - Too much manual work

---

#### 4. `SQLAlchemy` v2.0+

```python
from sqlalchemy import create_engine

engine = create_engine(DATABASE_URL)
df.to_sql('votes', engine, if_exists='append', index=False)
```

**Why:**

- ORM + raw SQL support
- Database-agnostic (easy migration SQLite → PostgreSQL)
- Connection pooling built-in
- Schema migrations with Alembic

**Alternatives:**

- `psycopg2` - Lower level, PostgreSQL only
- `sqlite3` - Built-in, but only for SQLite
- Raw SQL strings - Error-prone, no type safety

---

#### 5. `python-dotenv` v1.0+

```python
from dotenv import load_dotenv
import os

load_dotenv()
API_KEY = os.getenv('ANTHROPIC_API_KEY')
```

**Why:**

- Never commit secrets to Git
- Easy dev/prod environment switching
- Standard practice in Python projects

---

#### 6. `anthropic` SDK v0.18+

```python
import anthropic

client = anthropic.Anthropic(api_key=API_KEY)
message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1000,
    messages=[{"role": "user", "content": prompt}]
)
```

**Why:**

- Official SDK from Anthropic
- Type hints and auto-completion
- Handles rate limiting and retries
- Streaming support (if needed later)

**Alternatives:**

- Raw HTTP requests - More work, no error handling
- `openai` SDK - Wrong provider

---

## LAYER 2: AI Processing

### Anthropic Claude API

**Models used:**

#### Claude Sonnet 4 (`claude-sonnet-4-20250514`)

```
Use for: Context explanation, complex analysis
Cost: $3/1M input tokens, $15/1M output tokens
Why: Best quality, good for nuanced understanding
```

#### Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)

```
Use for: Poland relevance scoring, simple categorization
Cost: $1/1M input tokens, $5/1M output tokens
Why: Cheaper, fast, good enough for structured tasks
```

**Why Claude over GPT-4:**

```
✅ Better with long contexts (200k tokens)
✅ More accurate following complex instructions
✅ Less hallucination (more "honest")
✅ Higher rate limits (50 RPM vs 10 RPM)
✅ Similar pricing
✅ Better structured output support
❌ Smaller community than OpenAI
❌ Fewer integrations
```

**Why not local LLM:**

```
❌ Need GPU ($1+/hour on cloud)
❌ Slower inference
❌ More maintenance
❌ Quality lower than Claude/GPT-4
✅ Would be free long-term
✅ More control
```

**Decision:** Cloud AI (Claude) for MVP, evaluate local models later if costs become issue

**Cost optimization strategy:**

```python
def select_model(task_complexity):
    if task_complexity == "high":
        return "claude-sonnet-4-20250514"
    else:
        return "claude-haiku-4-5-20251001"  # 70% cheaper
```

---

## LAYER 3: Database

### PostgreSQL 15+

**Why PostgreSQL:**

```
✅ Open source, free
✅ ACID compliance (data integrity critical)
✅ Excellent performance (handle millions of rows)
✅ JSON support (flexibility for unstructured data)
✅ Full-text search (useful for future search features)
✅ Great tools (pgAdmin, DataGrip, DBeaver)
✅ Easy backup/restore
✅ Industry standard (easy to hire devs)
✅ Scales to 100GB+ without issues
```

**Alternatives considered:**

**SQLite:**

```
✅ Zero setup, file-based
✅ Perfect for MVP (<10GB)
✅ Fast reads
✅ Good for local development
❌ No concurrent writes (single writer)
❌ Harder to scale later
❌ No built-in replication
```

**MongoDB:**

```
✅ Flexible schema
✅ Good for rapid prototyping
❌ Overkill for structured data
❌ Weaker query capabilities vs SQL
❌ Larger memory footprint
❌ More expensive hosting
```

**MySQL:**

```
✅ Popular, well-supported
✅ Good performance
❌ Less features than PostgreSQL
❌ Weaker JSON support
❌ More licensing complexity
```

**Decision:** PostgreSQL for production, SQLite for local dev/testing

---

### Supabase (Managed PostgreSQL)

**Why Supabase:**

```
✅ Managed PostgreSQL (zero maintenance)
✅ Free tier: 500MB database, 1GB file storage
✅ Automatic daily backups
✅ Web UI for database management
✅ Built-in authentication (if needed later)
✅ Auto-generated APIs (optional)
✅ Real-time subscriptions (optional)
✅ Easy upgrade path ($25/month for 8GB)
```

**Alternatives:**

**Self-hosted PostgreSQL:**

```
✅ Full control
✅ No vendor lock-in
❌ Need to manage backups
❌ Need to handle scaling
❌ Security maintenance
❌ Requires server ($5-10/month minimum)
```

**Railway:**

```
✅ Simple deployment
✅ Good free tier
❌ More expensive than Supabase at scale
❌ Less mature than Supabase
```

**AWS RDS:**

```
✅ Battle-tested, enterprise-grade
❌ Expensive (~$15/month minimum)
❌ Complex setup
❌ Overkill for MVP
```

**Decision:** Supabase for MVP, easy to migrate if needed

---

### SQLAlchemy ORM

**Why ORM:**

```
✅ Type-safe queries (catch errors early)
✅ Database-agnostic (SQLite → PostgreSQL seamless)
✅ Automatic relationship handling
✅ Migration support (Alembic)
✅ Less SQL boilerplate
❌ Learning curve
❌ Slight performance overhead (negligible)
```

**Alternative: Raw SQL**

```python
# Raw SQL - error prone
cursor.execute("SELECT * FROM meps WHERE id = %s", (mep_id,))

# SQLAlchemy - type safe
mep = session.query(MEP).filter(MEP.id == mep_id).first()
```

**Decision:** SQLAlchemy for safety and maintainability

---

## LAYER 4: Web Application

### Next.js 14 (App Router)

**Why Next.js:**

```
✅ React framework (familiar, huge ecosystem)
✅ Server-side rendering (SEO critical)
✅ Static generation (fast, cheap hosting)
✅ File-based routing (intuitive)
✅ API routes (backend in same project)
✅ Image optimization (automatic)
✅ Built-in TypeScript support
✅ Excellent developer experience
✅ Vercel deployment (1-click)
✅ Great documentation
✅ Huge community (easy to find help)
```

**Why App Router (not Pages Router):**

```
✅ Future of Next.js
✅ Server Components (better performance)
✅ Simplified data fetching
✅ Better layouts and nesting
✅ Streaming support
❌ Newer (less Stack Overflow answers)
```

**Alternatives:**

**Astro:**

```
✅ Faster (less JS shipped to client)
✅ Multi-framework support
❌ Younger ecosystem
❌ Less features out-of-box
❌ Smaller community
```

**SvelteKit:**

```
✅ Lighter bundle sizes
✅ Less boilerplate
✅ Great DX
❌ Smaller job market (worse for portfolio)
❌ Smaller ecosystem
```

**Remix:**

```
✅ Great for data-heavy apps
✅ Progressive enhancement
❌ Smaller community than Next.js
❌ Fewer third-party integrations
```

**Plain React (Vite):**

```
✅ Simple, minimal
❌ No SSR (bad for SEO)
❌ No file routing
❌ More configuration needed
```

**Decision:** Next.js 14 with App Router - industry standard, best for portfolio

---

### TypeScript 5.3+

**Why TypeScript:**

```
✅ Catch bugs at compile time (not runtime)
✅ Better IDE autocomplete and intellisense
✅ Self-documenting code (types as docs)
✅ Easier refactoring (safe renames)
✅ Better team collaboration
✅ Industry standard for React projects
❌ Extra boilerplate (type definitions)
❌ Learning curve for beginners
```

**Alternative: JavaScript**

```
✅ No compilation step
✅ Less boilerplate
❌ Runtime errors hard to catch
❌ Worse IDE support
❌ Harder to maintain
```

**Decision:** TypeScript - worth the overhead for maintainability

---

### React 18

**Why React:**

```
✅ Largest ecosystem (components, tools, jobs)
✅ Declarative UI (easy to reason about)
✅ Component reusability
✅ Virtual DOM (good performance)
✅ Server Components (Next.js integration)
✅ Industry standard (best for portfolio)
```

**Not considering alternatives** - React is de facto standard for Next.js

---

### Tailwind CSS 3.4+

**Why Tailwind:**

```
✅ Utility-first (rapid development)
✅ No context switching (CSS in JSX)
✅ Responsive design built-in
✅ Customizable design system
✅ Purge unused CSS (small bundle)
✅ Great documentation
✅ Huge community
✅ Works great with Next.js
```

**Alternatives:**

**CSS Modules:**

```
✅ Scoped styles
✅ Standard CSS syntax
❌ More files to manage
❌ Context switching (CSS ↔ JSX)
```

**Styled Components:**

```
✅ CSS-in-JS
✅ Dynamic styling
❌ Runtime performance cost
❌ Harder with Next.js App Router (RSC)
```

**Plain CSS:**

```
✅ No dependencies
❌ Global namespace issues
❌ No tree-shaking
❌ Harder to maintain
```

**Decision:** Tailwind CSS - fastest development, great with Next.js

---

### Radix UI (Headless Components)

**Why Radix:**

```
✅ Headless (full control over styling)
✅ Accessibility built-in (a11y compliant)
✅ Unstyled (use Tailwind for design)
✅ Lightweight
✅ Works with React Server Components
✅ Great for Dialog, Dropdown, Tooltip, etc.
```

**Alternatives:**

**shadcn/ui:**

```
✅ Pre-styled Radix components
✅ Copy-paste approach (no dependency)
✅ Beautiful defaults
❌ Opinionated design (we want custom)
```

**Material UI:**

```
✅ Complete component library
❌ Heavy bundle size
❌ Difficult to customize
❌ Material Design language (not our style)
```

**Ant Design:**

```
✅ Comprehensive components
❌ Chinese design aesthetic
❌ Heavy bundle
❌ Hard to customize
```

**Headless UI (by Tailwind):**

```
✅ Similar to Radix
✅ Official Tailwind companion
❌ Radix has more components
❌ Radix better a11y
```

**Decision:** Radix UI - best balance of flexibility and accessibility

---

## LAYER 5: Hosting & Infrastructure

### Vercel (Frontend)

**Why Vercel:**

```
✅ Made by Next.js team (perfect integration)
✅ Free tier: 100GB bandwidth, unlimited builds
✅ Automatic HTTPS
✅ Global CDN (fast everywhere)
✅ Preview deployments (every Git branch)
✅ Zero configuration
✅ Environment variables management
✅ Built-in analytics
✅ Edge Functions support
✅ Image optimization
```

**Free tier limits:**

```
- 100GB bandwidth/month (~10k visitors)
- Unlimited sites and builds
- Serverless function execution
- Automatic SSL
```

**When to upgrade ($20/month Pro):**

```
- >100GB bandwidth
- Team collaboration features
- Password protection
- Advanced analytics
```

**Alternatives:**

**Netlify:**

```
✅ Similar features to Vercel
✅ Good free tier
❌ Slightly worse Next.js integration
❌ Less popular for Next.js projects
```

**Cloudflare Pages:**

```
✅ Unlimited bandwidth (!)
✅ Free tier very generous
❌ Less features than Vercel
❌ More complex setup
❌ Fewer Next.js optimizations
```

**AWS Amplify:**

```
✅ AWS integration
❌ More expensive
❌ Complex setup
❌ Overkill for MVP
```

**Decision:** Vercel - best for Next.js, generous free tier

---

### GitHub Actions (Automation)

**Why GitHub Actions:**

```
✅ Free (2,000 minutes/month)
✅ Integrated with repo
✅ Easy YAML configuration
✅ Good documentation
✅ Logs and notifications
✅ Manual trigger support
✅ Cron scheduling
```

**Example monthly scrape workflow:**

```yaml
name: Monthly Data Update
on:
  schedule:
    - cron: '0 2 20 * *' # 20th day, 2 AM UTC
  workflow_dispatch: # Manual trigger

jobs:
  scrape-and-process:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
      - run: pip install -r requirements.txt
      - run: python scripts/scrape.py
      - run: python scripts/process_ai.py
      - run: npm run build
```

**Alternatives:**

**Cron job on VPS:**

```
✅ Full control
❌ Need to maintain server
❌ Costs money ($5+/month)
❌ More complex setup
```

**AWS Lambda + EventBridge:**

```
✅ Scalable
✅ Pay per execution
❌ More complex setup
❌ AWS learning curve
```

**Heroku Scheduler:**

```
✅ Simple
❌ Not free anymore
❌ Less flexible than GitHub Actions
```

**Decision:** GitHub Actions for MVP - free, simple, integrated

---

### Vercel Blob (File Storage)

**Why Vercel Blob:**

```
✅ Integrated with Vercel
✅ Free tier: 1GB storage
✅ CDN delivery (fast)
✅ Simple API
✅ Edge-compatible
```

**Use case:** MEP photos, generated graphics

**Alternatives:**

**Cloudinary:**

```
✅ Free tier: 25GB bandwidth/month
✅ Image transformations (resize, crop, optimize)
✅ Better for many images
❌ External service (another dependency)
```

**AWS S3:**

```
✅ Cheapest at scale
✅ Industry standard
❌ Complex setup
❌ Need CloudFront for CDN
```

**Decision:** Vercel Blob for MVP (53 photos = ~10MB), migrate to Cloudinary if needed

---

## LAYER 6: Development & Operations

### Git + GitHub

**Why GitHub (not GitLab/Bitbucket):**

```
✅ Largest developer community
✅ GitHub Actions (CI/CD)
✅ Best third-party integrations
✅ GitHub Copilot (AI coding assistant)
✅ Free unlimited private repos
✅ Industry standard (good for portfolio)
```

---

### npm (Package Management)

**Why npm:**

```
✅ Default with Node.js
✅ Largest package registry
✅ Fast enough for our needs
✅ Familiar to most developers
```

**Alternative: pnpm**

```
✅ Faster installs
✅ Disk space efficient (symlinks)
❌ Some packages incompatible
❌ Less common (team onboarding)
```

**Decision:** npm for simplicity and compatibility

---

### ESLint + Prettier

**Why linting:**

```
✅ Consistent code style
✅ Catch bugs early (unused vars, etc)
✅ Auto-fix on save
✅ Better team collaboration
```

**Configuration:**

```json
// .eslintrc.json
{
  "extends": ["next/core-web-vitals", "prettier"],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

---

## LAYER 7: Monitoring & Analytics

### Google Analytics (MVP) → Plausible (Later)

**MVP: Google Analytics**

```
✅ Free
✅ Comprehensive data
✅ Familiar to most people
❌ Privacy concerns (cookies)
❌ GDPR cookie banner needed
❌ Heavy script (~45KB)
```

**Future: Plausible Analytics**

```
✅ Privacy-friendly (no cookies!)
✅ No GDPR banner needed
✅ Lightweight (<1KB)
✅ Beautiful dashboard
✅ GDPR compliant by design
❌ Costs €9/month (up to 10k visitors)
```

**Decision:** Start with GA (free), migrate to Plausible when budget allows

---

### Sentry (Error Tracking)

**Why Sentry:**

```
✅ Free tier: 5,000 errors/month
✅ Source maps (readable stack traces)
✅ User context and breadcrumbs
✅ Performance monitoring
✅ Email/Slack alerts
✅ Easy Next.js integration
```

**Configuration:**

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
})
```

---

### UptimeRobot (Uptime Monitoring)

**Why UptimeRobot:**

```
✅ Free tier: 50 monitors
✅ 5-minute check intervals
✅ Email alerts
✅ Public status page
✅ Simple setup
```

**What to monitor:**

```
- https://europosłowie.info (homepage)
- https://europosłowie.info/api/health (API)
```

---

## Cost Breakdown

### Monthly Costs (Production)

```
MUST HAVE:
- Domain (.pl)                    $1/month (€12/year)
- Claude API                      $6/month (estimated)
- Supabase Free Tier              $0 (500MB)
- Vercel Free Tier                $0 (100GB bandwidth)
- Vercel Blob                     $0 (1GB storage)
- GitHub Actions                  $0 (2000 min/month)
- UptimeRobot                     $0 (free tier)
- Sentry                          $0 (free tier)
- Google Analytics                $0
────────────────────────────────────
TOTAL MVP:                        ~$7/month

OPTIONAL (Future):
- Plausible Analytics             $9/month
- Vercel Pro                      $20/month (if >100GB)
- Supabase Pro                    $25/month (if >500MB)
────────────────────────────────────
TOTAL FUTURE:                     ~$61/month
```

### Development Costs

```
- GitHub Free                     $0
- Local PostgreSQL                $0 (Docker)
- VSCode                          $0
- All npm packages                $0 (open source)
────────────────────────────────────
TOTAL DEV:                        $0
```

---

## Dependencies Overview

### Python (`requirements.txt`)

```txt
# Core
python>=3.11

# Web scraping
requests==2.31.0
beautifulsoup4==4.12.3
lxml==5.1.0

# Data processing
pandas==2.1.4
numpy==1.26.3

# Database
sqlalchemy==2.0.25
psycopg2-binary==2.9.9  # PostgreSQL driver
alembic==1.13.1  # Migrations

# AI
anthropic==0.18.1

# Utilities
python-dotenv==1.0.0
pydantic==2.5.3  # Data validation
```

### Node.js (`package.json`)

```json
{
  "dependencies": {
    "next": "14.1.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "typescript": "5.3.3",

    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",

    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",

    "@vercel/blob": "^0.19.0",
    "@sentry/nextjs": "^7.99.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.5",
    "@types/react": "^18.2.48",
    "eslint": "^8.56.0",
    "eslint-config-next": "14.1.0",
    "prettier": "^3.2.4"
  }
}
```

---

## Migration Paths

### Database: SQLite → PostgreSQL

```python
# Thanks to SQLAlchemy, just change connection string:

# Development
# engine = create_engine('sqlite:///europosel.db')

# Production
engine = create_engine(os.getenv('DATABASE_URL'))

# Zero code changes needed!
```

### Hosting: Vercel → Self-hosted

```bash
# Next.js is portable
# Can deploy to:
# - Docker container
# - AWS/GCP/Azure
# - Kubernetes
# - Railway, Fly.io, etc.
```

### AI: Claude → Local LLM

```python
# Abstraction makes this easy:

class AIProvider:
    def analyze(self, text): pass

class ClaudeProvider(AIProvider):
    def analyze(self, text):
        return anthropic_api.call(text)

class LocalLLMProvider(AIProvider):
    def analyze(self, text):
        return ollama_api.call(text)

# Easy to swap
```

---

## Decision Records

### Why Next.js over Astro?

**Context:** Need fast, SEO-friendly site  
**Decision:** Next.js  
**Reasoning:**

- Larger ecosystem (more jobs, better for portfolio)
- Better when need interactivity later
- More Stack Overflow answers
- Familiarity with React

### Why Claude over GPT-4?

**Context:** Need AI for context explanation  
**Decision:** Claude (with option to use GPT-4)  
**Reasoning:**

- Better with long contexts (200k tokens)
- Less hallucination in testing
- Similar pricing
- Can easily swap if needed

### Why PostgreSQL over MongoDB?

**Context:** Need to store structured data  
**Decision:** PostgreSQL  
**Reasoning:**

- Data is highly relational (MEPs ↔ Votes)
- Need ACID guarantees
- SQL is more familiar
- Better for complex queries

### Why Supabase over self-hosted?

**Context:** Need database hosting  
**Decision:** Supabase for MVP  
**Reasoning:**

- Zero maintenance
- Free tier sufficient
- Easy to migrate away if needed
- Can self-host PostgreSQL later

---

## Related Documents

- `PROJECT_OVERVIEW.md` - Project goals and scope
- `DATABASE_SCHEMA.md` - Detailed database structure
- `ARCHITECTURE.md` - System architecture diagrams
- `SETUP_GUIDE.md` - How to set up dev environment
- `DEPLOYMENT.md` - How to deploy to production

---

## Changes Log

- **2024-12-10 v0.1:** Initial version with complete tech stack breakdown

---

_This is a living document. Update as technology choices evolve._
