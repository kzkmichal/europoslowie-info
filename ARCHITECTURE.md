# ARCHITECTURE.md

**Status:** Draft  
**Last Updated:** 2024-12-10  
**Owner:** Michał  
**Version:** 0.1

---

## Purpose

Ten dokument opisuje architekturę systemu Europosłowie.info - jak komponenty ze sobą współpracują, jak płyną dane, oraz jak system jest zorganizowany na różnych poziomach abstrakcji.

---

## TL;DR

System składa się z 3 głównych komponentów:

1. **Python ETL Pipeline** (scraping + AI processing) → runs monthly
2. **PostgreSQL Database** (data storage) → always available
3. **Next.js Web App** (frontend + API) → serves users

Dane płyną: **PE API → Python → PostgreSQL → Next.js → User**

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐        ┌──────────────────┐         │
│  │ Parlament        │        │ Anthropic        │         │
│  │ Europejski API   │        │ Claude API       │         │
│  └────────┬─────────┘        └────────┬─────────┘         │
│           │                           │                    │
└───────────┼───────────────────────────┼────────────────────┘
            │                           │
            ↓                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    ETL PIPELINE (Python)                     │
│                  Triggered: Monthly (GitHub Actions)         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │   Scrapers   │ → │  AI          │ → │  Database   │  │
│  │              │    │  Processing  │    │  Writer     │  │
│  └──────────────┘    └──────────────┘    └─────────────┘  │
│                                                             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                     │
│                    Hosted: Supabase                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tables: meps, votes, voting_sessions, questions,          │
│          speeches, committee_memberships, monthly_stats     │
│                                                             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    WEB APPLICATION (Next.js)                 │
│                    Hosted: Vercel                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │   Frontend   │ ← │  API Routes  │ ← │  Database   │  │
│  │   (React)    │    │  (Next.js)   │    │  Client     │  │
│  └──────────────┘    └──────────────┘    └─────────────┘  │
│                                                             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                         USERS                                │
├─────────────────────────────────────────────────────────────┤
│  Content Creators  |  Citizens  |  Journalists              │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Component 1: ETL Pipeline (Python)

**Location:** `/scripts` directory in repo  
**Runtime:** GitHub Actions (scheduled monthly)  
**Language:** Python 3.11+

```
scripts/
├── scrape_meps.py           # Pobiera listę posłów
├── scrape_votes.py          # Pobiera głosowania z ostatniej sesji
├── scrape_attendance.py     # Pobiera obecność
├── scrape_questions.py      # Pobiera pytania parlamentarne
├── scrape_speeches.py       # Pobiera wystąpienia
├── process_ai.py            # Przetwarza przez AI
├── calculate_metrics.py     # Oblicza rankingi i statystyki
└── utils/
    ├── pe_api.py            # Helper dla PE API
    ├── db.py                # Database connections
    └── logger.py            # Logging setup
```

**Data Flow:**

```
1. scrape_meps.py
   ↓ (lista 53 posłów)

2. scrape_votes.py
   ↓ (150+ głosowań z ostatniej sesji)

3. process_ai.py
   ├─→ Claude: Context explanation
   ├─→ Claude: Poland relevance (⭐)
   └─→ Claude: Arguments extraction
   ↓ (wzbogacone dane)

4. calculate_metrics.py
   ↓ (rankingi, % obecności, etc)

5. Write to Database
   ↓ (PostgreSQL via SQLAlchemy)

✓ Done
```

**Trigger:**

```yaml
# GitHub Actions schedule
on:
  schedule:
    - cron: '0 2 20 * *' # 20th of month, 2 AM UTC
  workflow_dispatch: # Manual trigger option
```

**Error Handling:**

```python
# Each scraper has retry logic
@retry(max_attempts=3, backoff=exponential)
def scrape_with_retry():
    try:
        data = fetch_from_api()
        validate(data)
        return data
    except APIError as e:
        log_error(e)
        send_alert(e)
        raise
```

---

### Component 2: Database (PostgreSQL)

**Hosting:** Supabase (managed)  
**Version:** PostgreSQL 15+  
**Access:** SQLAlchemy ORM (Python) + Prisma/raw SQL (Next.js)

**Schema Overview:**

```
┌──────────────┐
│     meps     │  (53 rows - polscy posłowie)
└──────┬───────┘
       │
       │ 1:N
       ↓
┌──────────────────┐
│ monthly_stats    │  (53 × 12 = 636 rows/year)
└──────────────────┘

┌──────────────────┐
│ voting_sessions  │  (12-15 sessions/year)
└──────┬───────────┘
       │
       │ 1:N
       ↓
┌──────────────┐
│    votes     │  (53 × 150 = 7,950 votes/month)
└──────────────┘

┌──────────────┐
│  questions   │  (~5 per MEP per month)
└──────────────┘

┌──────────────┐
│   speeches   │  (~3 per MEP per month)
└──────────────┘
```

**Indexes:**

```sql
-- Fast lookups
CREATE INDEX idx_votes_mep_id ON votes(mep_id);
CREATE INDEX idx_votes_session_id ON votes(session_id);
CREATE INDEX idx_votes_date ON votes(created_at DESC);

-- Full-text search (future)
CREATE INDEX idx_sessions_title_search
  ON voting_sessions USING gin(to_tsvector('english', title));
```

**Size Estimates:**

```
Year 1:
- meps: 53 rows × 1KB = 53KB
- votes: 95,400 rows × 500B = 47MB
- sessions: 150 rows × 5KB = 750KB
- stats: 636 rows × 2KB = 1.3MB
- Total: ~50MB

Year 5: ~250MB (well within free tier 500MB)
```

---

### Component 3: Web Application (Next.js)

**Hosting:** Vercel  
**Framework:** Next.js 14 (App Router)  
**Language:** TypeScript

**Directory Structure:**

```
app/
├── layout.tsx              # Root layout
├── page.tsx                # Homepage (lista posłów)
├── poslowie/
│   ├── page.tsx           # Lista wszystkich posłów
│   └── [slug]/
│       └── page.tsx       # Profil posła (dynamic route)
├── votes/
│   └── [id]/
│       └── page.tsx       # Szczegóły głosowania
├── top/
│   └── page.tsx           # Top głosowania miesiąca
├── about/
│   └── page.tsx           # O projekcie
└── api/
    ├── health/
    │   └── route.ts       # Health check endpoint
    └── meps/
        └── route.ts       # API endpoint (optional)

components/
├── MEPCard.tsx            # Karta posła
├── MEPProfile.tsx         # Pełny profil
├── VoteCard.tsx           # Karta głosowania
├── VoteDetails.tsx        # Szczegóły głosowania
├── MetricsTable.tsx       # Tabela metryk
├── StarsRating.tsx        # ⭐⭐⭐⭐⭐ display
└── ui/
    ├── Button.tsx
    ├── Dialog.tsx         # Radix wrapper
    └── ...

lib/
├── db.ts                  # Database queries
├── types.ts               # TypeScript types
├── utils.ts               # Helper functions
└── constants.ts           # Config constants
```

**Rendering Strategy:**

```typescript
// Static Generation (pre-rendered at build time)
// app/poslowie/[slug]/page.tsx

export async function generateStaticParams() {
  const meps = await db.query.meps.findMany()
  return meps.map((mep) => ({ slug: mep.slug }))
}

// This page is generated at build time for all 53 MEPs
export default async function MEPPage({ params }) {
  const mep = await getMEP(params.slug)
  return <MEPProfile mep={mep} />
}
```

**Benefits:**

- ✅ Super fast (pre-generated HTML)
- ✅ Great SEO (crawlers see full content)
- ✅ Cheap hosting (static files)
- ✅ Can revalidate on-demand

**API Layer:**

```typescript
// lib/db.ts - Database queries

export async function getMEP(slug: string) {
  const mep = await db.query.meps.findFirst({
    where: eq(meps.slug, slug),
    with: {
      monthlyStats: {
        orderBy: desc(monthlyStats.month),
        limit: 12,
      },
      votes: {
        where: gte(votes.stars, 4), // Only ⭐⭐⭐⭐+
        orderBy: desc(votes.date),
        limit: 10,
      },
    },
  })
  return mep
}

export async function getTopVotes(month: string) {
  return db.query.votes.findMany({
    where: and(eq(votes.month, month), eq(votes.stars, 5)),
    orderBy: desc(votes.date),
  })
}
```

---

## Data Flow Diagrams

### Flow 1: Monthly Data Update

```
┌─────────────────────────────────────────────────────────────┐
│ TRIGGER: 20th of month, 2 AM UTC (GitHub Actions)          │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Scrape Raw Data                                     │
├─────────────────────────────────────────────────────────────┤
│  PE API → Python requests → JSON                            │
│  Duration: ~5-10 minutes                                    │
│  Output: raw_data/*.json                                    │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Process with AI                                     │
├─────────────────────────────────────────────────────────────┤
│  For each vote (150):                                       │
│    1. Claude Sonnet: Context explanation                    │
│    2. Claude Haiku: Poland relevance (⭐)                   │
│    3. Claude Haiku: Arguments extraction                    │
│  Duration: ~15-20 minutes (parallel processing)             │
│  Output: enriched_data/*.json                               │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Calculate Metrics                                   │
├─────────────────────────────────────────────────────────────┤
│  For each MEP (53):                                         │
│    - Attendance rate                                        │
│    - Vote distribution (ZA/PRZECIW/WSTRZ)                   │
│    - Ranking among Poles                                    │
│    - Ranking in EP group                                    │
│  Duration: ~2 minutes                                       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Write to Database                                   │
├─────────────────────────────────────────────────────────────┤
│  SQLAlchemy → PostgreSQL                                    │
│  - Insert new votes                                         │
│  - Update monthly_stats                                     │
│  - Insert speeches, questions                               │
│  Duration: ~1-2 minutes                                     │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Trigger Next.js Rebuild                             │
├─────────────────────────────────────────────────────────────┤
│  GitHub Actions → Vercel Webhook                            │
│  Next.js regenerates static pages                           │
│  Duration: ~5 minutes                                       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ ✓ DONE: New data live on website                           │
│ Total duration: ~30-40 minutes                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Flow 2: User Request (Page View)

```
┌─────────────────────────────────────────────────────────────┐
│ User visits: /poslowie/jan-kowalski                         │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Vercel Edge Network (CDN)                                   │
├─────────────────────────────────────────────────────────────┤
│  Check: Is page cached?                                     │
│    YES → Return cached HTML (< 50ms)                        │
│    NO  → Continue to Next.js                                │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Next.js Server (Serverless Function)                        │
├─────────────────────────────────────────────────────────────┤
│  1. Parse route: extract "jan-kowalski"                     │
│  2. Query database (via lib/db.ts)                          │
│  3. Render React components                                 │
│  4. Generate HTML                                           │
│  Duration: ~200-500ms (first time)                          │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Database Query (PostgreSQL)                                 │
├─────────────────────────────────────────────────────────────┤
│  SELECT * FROM meps WHERE slug = 'jan-kowalski'             │
│  JOIN monthly_stats ...                                     │
│  JOIN votes WHERE stars >= 4 LIMIT 10                       │
│  Duration: ~10-50ms                                         │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Response to User                                            │
├─────────────────────────────────────────────────────────────┤
│  HTML + CSS + minimal JS                                    │
│  Cached by CDN for next user                                │
│  Total Time-To-First-Byte: ~300-700ms (first time)         │
│  Total Time-To-First-Byte: < 50ms (cached)                 │
└─────────────────────────────────────────────────────────────┘
```

**Optimization:**

```typescript
// Next.js caching strategy
export const revalidate = 86400 // 24 hours

// After data update, invalidate cache:
await fetch('https://api.vercel.com/v1/deployments/...', {
  method: 'POST',
  body: JSON.stringify({ revalidate: true }),
})
```

---

### Flow 3: AI Processing Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│ Input: Raw vote data from PE API                            │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ AI Agent 1: Context Explainer                               │
├─────────────────────────────────────────────────────────────┤
│  Model: Claude Sonnet 4                                     │
│  Input: Vote title + document summary (5k tokens)           │
│  Prompt: "Explain in simple Polish what this vote is about" │
│  Output: 100-150 word explanation                           │
│  Cost: ~$0.02 per vote                                      │
│  Cache: Yes (reuse for all 53 MEPs)                         │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ AI Agent 2: Poland Relevance Scorer                         │
├─────────────────────────────────────────────────────────────┤
│  Model: Claude Haiku 4.5 (cheaper)                          │
│  Input: Context + document + Polish economic data (3k)      │
│  Prompt: "Rate Poland relevance 1-5 stars with reasoning"   │
│  Output: JSON { stars: 5, reasoning: [...] }                │
│  Cost: ~$0.01 per vote                                      │
│  Cache: Yes                                                 │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ AI Agent 3: Arguments Extractor                             │
├─────────────────────────────────────────────────────────────┤
│  Model: Claude Haiku 4.5                                    │
│  Input: Debate transcript (if available, 4k tokens)         │
│  Prompt: "Extract 3-5 arguments FOR and AGAINST"            │
│  Output: { for: [...], against: [...] }                     │
│  Cost: ~$0.01 per vote                                      │
│  Cache: Yes                                                 │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Output: Enriched vote data                                  │
├─────────────────────────────────────────────────────────────┤
│  {                                                          │
│    vote_id: 247,                                            │
│    title: "Budget UE 2025",                                 │
│    context_ai: "To głosowanie dotyczyło...",               │
│    stars_poland: 5,                                         │
│    stars_reasoning: ["Polska wymieniona...", ...],         │
│    arguments_for: ["Zwiększa Fundusz...", ...],           │
│    arguments_against: ["Za wysokie koszty...", ...]        │
│  }                                                          │
└────────────────────────┬────────────────────────────────────┘
                         ↓
                   Save to Database
```

**Optimization Strategy:**

```python
# Process in batches for efficiency
batch_size = 50  # Claude allows 50 RPM

for i in range(0, len(votes), batch_size):
    batch = votes[i:i+batch_size]

    # Process in parallel
    with ThreadPoolExecutor(max_workers=50) as executor:
        futures = [
            executor.submit(process_vote, vote)
            for vote in batch
        ]
        results = [f.result() for f in futures]

    # Rate limit: wait 60s between batches
    time.sleep(60)
```

**Cost per month:**

- 150 votes × $0.04/vote = **$6.00/month**
- Within budget ✓

---

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                         USERS                                │
│                    (Global audience)                         │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE NETWORK                       │
│                    (150+ locations globally)                 │
├─────────────────────────────────────────────────────────────┤
│  • HTTPS/SSL (automatic)                                    │
│  • CDN caching (static assets)                              │
│  • DDoS protection                                          │
│  • Geographic routing (low latency)                         │
└────────────────────────┬────────────────────────────────────┘
                         ↓
           ┌─────────────┴─────────────┐
           ↓                           ↓
┌──────────────────────┐    ┌──────────────────────┐
│  VERCEL SERVERLESS   │    │  STATIC ASSETS       │
│  (Next.js)           │    │  (Images, CSS, JS)   │
│  Region: US East     │    │  Cached globally     │
└──────────┬───────────┘    └──────────────────────┘
           │
           ↓
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                     │
│                    Region: EU Central                        │
├─────────────────────────────────────────────────────────────┤
│  • Connection pooling (Supavisor)                           │
│  • Automatic backups (daily)                                │
│  • Point-in-time recovery                                   │
│  • Read replicas (if needed)                                │
└─────────────────────────────────────────────────────────────┘
```

**Geographic Considerations:**

- **Frontend:** Served from nearest Edge location (Warsaw: ~20-30ms)
- **API/SSR:** US East serverless (~100-150ms from Poland)
- **Database:** EU Central (~50-80ms from Poland)
- **Total latency:** ~200-300ms (acceptable)

**If latency becomes issue:**

- Move Vercel region to EU (Frankfurt available)
- Use connection pooling (already via Supabase)
- Implement Redis cache (Upstash - $0.50/month)

---

### Development Environment

```
Developer Laptop
├── Next.js (localhost:3000)
│   └── Connects to: localhost:5432 (PostgreSQL)
├── PostgreSQL (Docker container)
│   └── Test data loaded from dump
└── Python scripts
    └── Run manually: python scripts/scrape.py
```

**Setup:**

```bash
# 1. Start local PostgreSQL
docker run -d \
  --name europosel-db \
  -e POSTGRES_PASSWORD=dev \
  -p 5432:5432 \
  postgres:15

# 2. Run migrations
npm run db:migrate

# 3. Seed test data
npm run db:seed

# 4. Start Next.js
npm run dev
```

---

## Scaling Considerations

### Current Capacity (MVP)

```
Users:
- 10,000 visitors/month
- 50,000 page views/month
- Peak: ~100 concurrent users

Database:
- 50MB data (Year 1)
- ~1,000 queries/hour
- 99.9% uptime

Bandwidth:
- 50GB/month (Vercel free tier: 100GB)

AI Processing:
- 150 votes/month
- $6/month cost
- ~30 min processing time
```

**Bottlenecks:**

1. ✅ **Frontend:** Vercel scales automatically (no issue)
2. ✅ **Database:** PostgreSQL handles 1k QPS easily (no issue)
3. ⚠️ **AI Processing:** 150 votes takes 30min (acceptable for monthly batch)
4. ⚠️ **Bandwidth:** 50GB/100GB used (room to grow)

---

### Scaling Path (Year 2-3)

**If traffic grows 10x (100k visitors/month):**

```
Changes needed:
1. Database:
   • Upgrade Supabase to Pro ($25/month)
   • Add read replicas for queries
   • Connection pooling (already have)

2. Hosting:
   • Upgrade Vercel to Pro ($20/month)
   • 1TB bandwidth included

3. Caching:
   • Add Redis (Upstash: $0.50/month)
   • Cache top pages (homepage, top MEPs)
   • TTL: 24 hours

4. AI:
   • No change (still monthly batch)
   • Cost stays ~$6/month

Total cost: ~$52/month (vs $7 now)
Still very affordable!
```

**If want real-time updates:**

```
Architecture change needed:
- Add message queue (BullMQ + Redis)
- Process votes as they happen
- Incremental updates vs batch
- Cost: ~$20-30/month more
```

---

### Multi-Region (Future)

**If expanding to other EU countries:**

```
Current:
┌─────────────┐
│   Poland    │  53 MEPs
└─────────────┘
      ↓
  Single DB

Future:
┌─────────────┬─────────────┬─────────────┐
│   Poland    │   Germany   │   France    │
│   53 MEPs   │   96 MEPs   │   81 MEPs   │
└─────────────┴─────────────┴─────────────┘
              ↓
     Shared DB (partitioned by country)

Scaling:
- Same architecture works
- Database: ~500MB (all countries)
- AI cost: $6 × 27 countries = $162/month
- Hosting: Need Pro tier ($20/month)
```

---

## Security Architecture

### Authentication & Authorization

**Current (MVP):**

```
No user accounts = No auth needed!
- All data is public
- Read-only access
- No user-generated content
```

**Future (if needed):**

```
Optional features requiring auth:
- Saved searches
- Email alerts
- API keys (for developers)

Use: Supabase Auth
- OAuth (Google, GitHub)
- Magic links
- Free tier: 50k MAU
```

---

### Data Security

**Database:**

```
✅ Encrypted at rest (Supabase default)
✅ Encrypted in transit (TLS)
✅ Connection via SSL
✅ No sensitive user data stored
✅ Regular backups (daily)
```

**API Keys:**

```
Storage:
- Environment variables (Vercel/GitHub secrets)
- Never in code
- Rotated every 6 months

.env.local (gitignored):
DATABASE_URL=...
ANTHROPIC_API_KEY=...
SENTRY_DSN=...
```

**Rate Limiting:**

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
})

export async function checkRateLimit(ip: string) {
  const { success } = await ratelimit.limit(ip)
  return success
}
```

---

## Monitoring Architecture

### Observability Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      APPLICATION                             │
└────────────┬────────────────────────────────────────────────┘
             │
   ┌─────────┼─────────┬─────────────┬──────────────┐
   ↓         ↓         ↓             ↓              ↓
┌──────┐ ┌───────┐ ┌────────┐ ┌──────────┐ ┌────────────┐
│Vercel│ │Sentry │ │ Google │ │ Uptime   │ │   Logs     │
│Analytics│      │ │Analytics│ │ Robot    │ │ (Vercel)   │
└──────┘ └───────┘ └────────┘ └──────────┘ └────────────┘
   │         │         │             │              │
   ↓         ↓         ↓             ↓              ↓
Performance Errors   Users     Availability   Debugging
```

**What we monitor:**

1. **Performance** (Vercel Analytics)

   - Time to First Byte (TTFB)
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Core Web Vitals

2. **Errors** (Sentry)

   - JavaScript errors
   - API failures
   - Database timeouts
   - AI API errors

3. **Users** (Google Analytics)

   - Page views
   - Unique visitors
   - Session duration
   - Bounce rate
   - Traffic sources

4. **Availability** (UptimeRobot)

   - Homepage (/) - check every 5 min
   - API health (/api/health) - check every 5 min
   - Alert if down >2 checks

5. **Business Metrics** (Custom)
   - MEPs updated this month
   - Votes processed
   - AI processing time
   - AI costs
   - Database size

---

### Alerting

```yaml
Alerts:
  Critical (Slack + Email):
    - Site down >10 minutes
    - Database connection failed
    - AI processing failed
    - Error rate >1%

  Warning (Email only):
    - Response time >2s
    - AI cost >$10/month
    - Database >400MB (80% of free tier)

  Info (Dashboard only):
    - Deployment successful
    - Scraper completed
    - Daily summary
```

---

## Disaster Recovery

### Backup Strategy

**Database (Supabase):**

```
Automatic:
- Daily snapshots (retained 7 days)
- Point-in-time recovery (7 days)

Manual:
- Monthly full dump (stored in GitHub repo)
- Before major migrations

Restore time: ~15 minutes
```

**Code (GitHub):**

```
- Version controlled
- All commits preserved
- Can rollback to any commit
- Restore time: ~5 minutes
```

**Environment Config:**

```
- Documented in .env.example
- Secrets in 1Password (team shared vault)
- Can recreate from scratch in 1 hour
```

---

### Failure Scenarios

**Scenario 1: Vercel outage**

```
Impact: Website down
Probability: Very low (99.99% uptime)
Recovery:
  • Wait for Vercel (usually <10 min)
  • OR: Deploy to backup (Netlify) in 15 min
MTTR: 15 minutes
```

**Scenario 2: Database corruption**

```
Impact: Data loss
Probability: Very low (Supabase has redundancy)
Recovery:
  • Restore from daily snapshot
  • Re-run last month's scraper
MTTR: 1 hour
Data loss: <24 hours
```

**Scenario 3: PE API changes**

```
Impact: Scraper breaks
Probability: Medium
Recovery:
  • Fix scraper code
  • Deploy update
  • Re-run
MTTR: 2-4 hours (depends on changes)
```

**Scenario 4: AI API rate limit hit**

```
Impact: Processing incomplete
Probability: Low (we respect rate limits)
Recovery:
  • Automatic retry with backoff
  • Process remaining votes
MTTR: Automatic (no intervention)
```

---

## Performance Targets

### Response Times

```
Target (95th percentile):
┌─────────────────────────┬──────────┬──────────┐
│ Metric                  │ Target   │ Current  │
├─────────────────────────┼──────────┼──────────┤
│ Homepage (cached)       │ <100ms   │ ~50ms    │
│ Homepage (uncached)     │ <500ms   │ ~300ms   │
│ MEP Profile (cached)    │ <100ms   │ ~50ms    │
│ MEP Profile (uncached)  │ <800ms   │ ~500ms   │
│ Vote Details (cached)   │ <100ms   │ ~50ms    │
│ Database query          │ <50ms    │ ~20ms    │
│ API endpoint            │ <200ms   │ ~100ms   │
└─────────────────────────┴──────────┴──────────┘
```

### Core Web Vitals

```
Target:
- LCP (Largest Contentful Paint): <2.5s
- FID (First Input Delay): <100ms
- CLS (Cumulative Layout Shift): <0.1

Optimization:
✅ Next.js Image optimization
✅ Font optimization (next/font)
✅ Code splitting (automatic)
✅ Static generation (most pages)
✅ CDN caching (Vercel Edge)
```

---

## Technology Decisions Log

### Why Next.js App Router vs Pages Router?

**Context:** Need to choose Next.js routing approach  
**Options:**

1. Pages Router (stable, more examples)
2. App Router (newer, better features)

**Decision:** App Router  
**Reasoning:**

- Future of Next.js
- Better Server Components support
- Simpler data fetching
- Better layouts
- Worth learning curve

**Trade-offs:**

- Less Stack Overflow answers
- Some libraries not compatible yet
- But: Better long-term investment

---

### Why Supabase vs Self-hosted PostgreSQL?

**Context:** Need database hosting  
**Options:**

1. Self-hosted on VPS ($5-10/month)
2. Supabase managed ($0-25/month)

**Decision:** Supabase  
**Reasoning:**

- Zero maintenance (no server management)
- Free tier sufficient for MVP
- Easy scaling path
- Can migrate away if needed

**Trade-offs:**

- Vendor lock-in (mild - PostgreSQL is portable)
- Monthly cost if exceed free tier
- But: Time saved > money saved

---

### Why GitHub Actions vs Heroku Scheduler?

**Context:** Need cron job for monthly scraping  
**Options:**

1. Heroku Scheduler ($7/month minimum)
2. GitHub Actions (free tier)
3. Cron on VPS ($5/month)

**Decision:** GitHub Actions  
**Reasoning:**

- Free (2000 minutes/month)
- Integrated with repo
- Good for MVP
- Easy to migrate later

**Trade-offs:**

- Not for high-frequency jobs
- But: We only need monthly (perfect fit)

---

## Related Documents

- `PROJECT_OVERVIEW.md` - High-level project goals
- `TECH_STACK.md` - Detailed technology choices
- `DATABASE_SCHEMA.md` - Database structure
- `SCRAPING_STRATEGY.md` - How we collect data
- `AI_PROMPTS.md` - AI processing details
- `DEPLOYMENT.md` - How to deploy

---

## Future Architecture Considerations

### When to introduce caching layer (Redis)?

**Trigger:**

- Response time >1s consistently
- Database connection pool saturated
- Traffic >50k visitors/month

**Implementation:**

```typescript
// Cache strategy
const cached = await redis.get(`mep:${slug}`)
if (cached) return JSON.parse(cached)

const mep = await db.getMEP(slug)
await redis.setex(`mep:${slug}`, 86400, JSON.stringify(mep))
return mep
```

---

### When to introduce queue system?

**Trigger:**

- Want real-time updates (not monthly batch)
- Multiple data sources to process
- Need retry logic for failed jobs

**Implementation:**

```typescript
// BullMQ + Redis
const queue = new Queue('scraping-jobs')

await queue.add('scrape-votes', {
  session_id: 123,
  retry: 3,
})
```

---

### When to introduce GraphQL?

**Trigger:**

- Complex nested queries needed
- Multiple clients (web, mobile, API)
- Over-fetching becomes issue

**Not needed for MVP** - REST/direct DB queries sufficient

---

## Changes Log

- **2024-12-10 v0.1:** Initial architecture documentation

---

_This is a living document. Update as architecture evolves._
