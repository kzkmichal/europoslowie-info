# Project Progress

Last updated: 2026-03-22

## ✅ Completed

### Phase 1: Database Setup

- [x] PostgreSQL database with Docker Compose
- [x] Alembic migrations setup
- [x] 7 database tables created (meps, votes, voting_sessions, monthly_stats, questions, speeches, committee_memberships)
- [x] Seed script with test data
- [x] Database connected to GitHub repository
- [x] Migration 003: `dec_label` column added to votes table

### Phase 2: Scrapers & Infrastructure - COMPLETE ✅

- [x] Base scraper class with common functionality
- [x] HTTP client with retry logic and rate limiting
- [x] HTTP client encoding issue fixed (ASCII-safe User-Agent)
- [x] Database connection and session management
- [x] Logging system (console + file)
- [x] Database writer utilities with batch insertion
- [x] MEPs scraper (API + web fallback strategy) - **WORKING WITH REAL EP API ✅**
- [x] Real data population: **53 active Polish MEPs** (4 test records removed, Kierwiński marked inactive)
- [x] Database encoding fixed (UTF-8 support for Polish characters)
- [x] Voting sessions scraper
- [x] Votes scraper (EP Open Data API v2, DEC/VOT-ITM hierarchy)
- [x] `is_main` detection fixed — added SUB_MARKERS: `Załącznik`, `Zalecenie`, `akapit`
- [x] `dec_label` extraction from `activity_label` (strips DOCREF - RAPPORTEUR prefix)
- [x] `ep_group` normalization: `Renew` → `Renew Europe`, `""` → `Niezrzeszeni`
- [x] Test script for individual scrapers
- [x] Comprehensive test suite (`test_all_scrapers.py`)
- [x] Main orchestration script (`run_scrapers.py`)
- [x] Python dependencies installed
- [x] Environment configuration (.env with DATABASE_URL)
- [x] Transaction handling (individual commit/rollback pattern)

### Phase 4: Frontend (Next.js) - COMPLETE ✅

#### Core setup
- [x] Next.js 16.1.0 setup with App Router
- [x] React 19.2.3 installation
- [x] TypeScript 5 configuration
- [x] Tailwind CSS 4 setup
- [x] Drizzle ORM 0.45.1 installation and configuration
- [x] PostgreSQL driver (postgres 3.4.7) setup
- [x] shadcn/ui installed (Tailwind v4 compatible) with components: Input, Select, Button, Badge
- [x] Database connection layer (`frontend/lib/db/index.ts`)
- [x] Drizzle schema matching PostgreSQL tables (`frontend/lib/db/schema.ts`)
- [x] Relations and type exports for all tables
- [x] ISR with appropriate revalidation times (86400s)

#### Query functions (`frontend/lib/db/queries.ts`)
- [x] `getAllMEPsWithStats()` — Homepage (filters `isActive = true`)
- [x] `getMepBySlug()` — MEP profile pages
- [x] `getVoteById()` — Vote details pages (includes `decLabel`, `isMain`)
- [x] `getCurrentMonthTopVotes()` — Top votes page
- [x] `getRelatedVotes(voteNumber)` — Related votes grouped by (title, session_id)
- [x] `getEpGroupBreakdown(voteNumber)` — Polish MEPs breakdown by EP group
- [x] `getMepSessionList(slug)` — lista sesji posła z mini-statystykami (tylko `is_main`)
- [x] `getMepVotesBySession(slug, sessionId)` — głosowania posła per sesja (tylko `is_main`)
- [x] `getMepMonthList(slug)` — lista miesięcy z głosowaniami MEP-a (year, month, voteCount, location)
- [x] `getMepVotesByMonth(slug, year, month)` — głosowania posła per miesiąc z deduplication
- [x] `getMepSpeechesBySession(slug, startDate, endDate)` — przemówienia w zakresie dat
- [x] `getMepQuestionsBySession(slug, startDate, endDate)` — pytania w zakresie dat
- [x] `getVotesList(options)` — strona listingowa głosowań (filtry: year/month/result, paginacja page/limit)

#### Pages
- [x] Homepage (`/`) — MEP grid with search/filter/sort; domyślny widok grupuje wg grupy EP z pełną nazwą; sortowanie po nazwisku
- [x] MEP profile page (`/poslowie/[slug]`) — stats, nawigacja po miesiącach (?month=YYYY-MM), historia głosowań pogrupowana po dniach z podsumowaniem, przemówienia/pytania per miesiąc
- [x] Votes listing page (`/glosowania`) — server-side filtering (year/month/result), paginacja, URL params, grupowanie po dacie
- [x] Vote details page (`/glosowania/[voteNumber]`) — full breakdown
- [x] Top votes page (`/top-glosowania`)
- [x] Static pages (Metodologia, O Projekcie)

#### Components — MEP profile page
- [x] `VoteMonthNav` — nawigacja po miesiącach: Select (miesiąc + lokalizacja + liczba głosowań) + prev/next; URL param `?month=YYYY-MM`
- [x] `VoteRow` — pojedyncze głosowanie w historii (badge koloru, pełny tytuł bez truncate, bez daty, link do szczegółów)
- [x] `StatsTable` — tabela statystyk miesięcznych (kolumny Przemówienia/Pytania widoczne gdy dane > 0; format miesiąca "lut 2026"; bez kolumny Ranking)

#### Components — Votes listing page
- [x] `VotesFilter` (client component) — filtry server-side: rok/miesiąc/wynik, URL params, reset paginacji przy zmianie filtra

#### Components — Vote details page
- [x] `AllMEPsVotingChart` — EP-wide vote totals (stacked bar: Za/Przeciw/Wstrz.)
- [x] `RelatedVotesList` — powiązane głosowania (table z linkami, current vote highlighted)
- [x] `EpGroupBreakdown` — breakdown głosowania polskich MEPs wg grupy EP
- [x] `MEPVoteList` — lista polskich posłów z ich wyborami
- [x] EP document link — link do oficjalnego dokumentu EP (prefers `decLabel` ref over `documentReference`)
- [x] `dec_label` subtitle — pokazywany gdy `!isMain && decLabel`

#### Components — Homepage
- [x] `MEPGrid` (client component) — grid posłów z kontrolkami; bez filtrów: grupowanie wg grupy EP (`GroupedMEPList`) z pełną nazwą (`EP_GROUP_FULL_NAMES`); z filtrami: płaska lista
- [x] `MEPCard` — karta posła: etykieta obecności 🟢/🟡/🔴 (≥90%/70–89%/<70%), głosowania z nieob., miesiąc/rok statystyk, przemówienia/pytania gdy >0; "Top głosowanie" ukryte
- [x] `useFilterMEP` hook — filtrowanie i sortowanie client-side
  - search po nazwisku (debounced 300ms)
  - filtr po `nationalParty`
  - filtr po `epGroup`
  - sortowanie: ranking / frekwencja / nazwisko (`localeCompare 'pl'`); domyślnie nazwisko
  - `clearFilters`, `hasActiveFilters`
- [x] Licznik "Wyświetlono X z 53 posłów"
- [x] Empty state przy braku wyników

#### Type system
- [x] `MEPWithStats`, `MEPProfile`, `MEPInfo`, `VoteWithMEP`, `VoteDetails`
- [x] `RelatedVote`, `EpGroupRow` (nowe typy)
- [x] `VoteDetailsById` — rozszerzony o `decLabel`, `isMain`
- [x] `MEPSessionSummary` — sesja z mini-statystykami głosowań posła
- [x] `MEPMonthSummary` — miesiąc z liczbą głosowań i lokalizacją sesji
- [x] `MEPVote` — rozszerzony o `sessionId`

## 🚧 In Progress

### Phase 3: AI Processing

- [ ] Claude API integration
- [ ] Context explanation generator (Sonnet 4)
- [ ] Poland relevance scorer (Haiku 4.5)
- [ ] Arguments extractor (Haiku 4.5)
- [ ] Batch processing pipeline

## 📋 Pending

### Phase 5: Automation

- [ ] GitHub Actions workflow
- [ ] Monthly scraping schedule
- [ ] Error alerting
- [ ] Monitoring setup

### Phase 6: Deployment

- [ ] Vercel deployment
- [ ] Supabase setup
- [ ] Environment variables configuration
- [ ] Analytics (Google Analytics)
- [ ] Error tracking (Sentry)

## 📊 Statistics

- **Database Tables:** 7/7 ✓ + migration 003 (dec_label)
- **Active MEPs in DB:** 53 ✓ (dane rzeczywiste, test records usunięte, Kierwiński inactive)
- **Scrapers:** 3/3 (100%) ✓
  - MEPs scraper ✓
  - Voting sessions scraper ✓
  - Votes scraper ✓
- **Processors:** 1/1 ✓
  - `calculate_stats.py` — monthly_stats z is_main głosowań, ranking wśród Polaków ✓
- **Frontend MVP:** 100% complete ✓
  - Pages: 7/7
  - Components: 19+
  - Type System: Complete
- **Query Functions:** 9/9 (100%) ✓
- **UI Library:** shadcn/ui ✓ (Input, Select, Button, Badge)

## 🎯 Next Steps

1. **Implementacja AI processing** — integracja Claude API dla kontekstu głosowań i scoringu
2. **Deploy MVP** — Vercel + Supabase

## 📝 Notes

- Database runs on port 5433 (5432 was in use)
- All environment variables in `.env.local` (not committed)
- Logs stored in `logs/` directory
- shadcn/ui uses `components/ui/` directory (oddzielone od komponentów biznesowych)
- `document_reference` w DB pochodzi z poziomu VOT-ITM (współdzielone między powiązanymi głosowaniami)
  — `buildEpDocInfo()` preferuje referencję z `decLabel` zamiast `documentReference`
- Kierwiński (ep_id: 257042) oznaczony `is_active = false` — objął stanowisko ministra; głosowania historyczne zachowane
