# PROJECT_OVERVIEW.md

**Status:** Draft  
**Last Updated:** 2024-12-10  
**Owner:** Michał  
**Version:** 0.2

---

## Purpose

Ten dokument definiuje cel, zakres i kluczowe założenia projektu Europosłowie.info - platformy transparentności politycznej monitorującej aktywność polskich europosłów w Parlamencie Europejskim.

---

## TL;DR (Elevator Pitch)

**Europosłowie.info** to platforma pokazująca w przystępny sposób jak głosują polscy europosłowie w sprawach związanych z Polską. Automatycznie zbieramy dane z Parlamentu Europejskiego, AI dodaje kontekst, a użytkownicy dostają czytelne raporty bez politycznych ocen - same fakty.

**Target:** Content creators (YouTuberzy, dziennikarze, analitycy) potrzebujący wiarygodnego źródła danych + obywatele chcący rozliczać swoich posłów.

---

## Problem Statement

### Główny problem:

Obywatele nie wiedzą jak głosują ich europosłowie, ponieważ:

- Oficjalne dane PE są w PDF/XML (nieprzystępne)
- Brak kontekstu - nie wiadomo dlaczego głosowanie jest ważne
- Information overload - 150+ głosowań miesięcznie
- Brak focus na polską perspektywę

### Pain points konkretnych użytkowników:

**Content creators:**

- 4-6h research na jedno video o głosowaniach
- Trudno znaleźć wiarygodne źródła
- Muszą ręcznie weryfikować dane
- Brak gotowych materiałów wizualnych

**Obywatele:**

- Nie wiedzą gdzie szukać informacji
- Oficjalne strony PE są skomplikowane
- Brak narzędzi porównawczych
- Trudno ocenić co jest ważne

**Dziennikarze:**

- Presja czasu (deadline)
- Potrzeba fact-checkingu
- Chcą pokazać lokalny kontekst (Polska)
- Brak prostych narzędzi

---

## Solution

### Co robimy:

**Platforma webowa która:**

1. **Automatycznie zbiera** dane z PE co miesiąc
2. **AI analizuje** kontekst i związek z Polską (⭐⭐⭐⭐⭐)
3. **Prezentuje** w przystępny sposób (responsive design)
4. **Priorytetyzuje** najważniejsze głosowania dla Polski
5. **Daje fakty** bez ocen moralnych (user sam ocenia)

### Kluczowa wartość:

**Dla content creators:**

- Oszczędność czasu: 6h → 30min research
- Wiarygodne źródło do cytowania
- Ready-to-use dane (export, graphics)

**Dla obywateli:**

- Przejrzystość - widzą jak głosuje ich poseł
- Kontekst - rozumieją dlaczego głosowanie ważne
- Porównywalność - widzą jak inni głosowali

**Dla dziennikarzy:**

- Fast fact-checking
- Gotowe cytaty z kontekstem
- Możliwość embedowania danych

---

## Core Principles (Wartości projektu)

### 1. **Rzetelność > Viralność**

- Pokazujemy tylko weryfikowalne fakty
- Linki do oficjalnych źródeł zawsze
- Transparentna metodologia
- Zero clickbait

### 2. **Neutralność polityczna**

- Nie oceniamy "dobrze/źle" głosowań
- Pokazujemy argumenty obu stron
- Nie faworyzujemy żadnej partii
- AI nie wtrąca politycznych opinii

### 3. **Prostota > Feature creep**

- Jedna rzecz zrobiona dobrze
- Intuicyjny UX
- Fast loading (<2s)
- Balanced responsive design (desktop + mobile)

### 4. **Otwartość**

- Open source (kod na GitHubie)
- Przejrzysta metodologia
- Możliwość zgłaszania błędów
- Community feedback welcome

### 5. **Użyteczność dla creators**

- Dane łatwe do cytowania
- Shareable URLs
- Export-friendly
- Attribution clear

---

## Target Audience

### Primary (Główni użytkownicy):

**1. Content Creators - Political (500-1000 osób w PL)**

- YouTuberzy polityczni (10k-1M subs)
- Podcasterzy
- Twitter/X analitycy
- TikTok explainers

**Potrzeby:**

- Szybki research
- Wiarygodne źródło
- Gotowe dane do video
- Możliwość cytowania

---

**2. Obywatele zainteresowani polityką (10k-50k reach)**

- Wykształceni (studia+)
- 25-55 lat
- Mieszkańcy miast
- Aktywni online

**Potrzeby:**

- Sprawdzić swojego posła
- Zrozumieć co się dzieje w PE
- Podzielić się w social media
- Uczestniczyć w dyskusji

---

### Secondary (Przyszli użytkownicy):

**3. Dziennikarze i media**

- Fact-checkerzy
- Reporterzy polityczni
- Redakcje online

**4. NGO i think tanki**

- Organizacje watchdog
- Badacze polityki
- Lobbyści

**5. Akademicy**

- Politolodzy
- Studenci stosunków międzynarodowych
- Badacze UE

---

## Scope

### ✅ MVP (Minimum Viable Product) - Co JEST w scope:

**Funkcjonalności:**

- Lista 53 polskich europosłów
- Profile posła (metryki + top głosowania)
- Szczegóły głosowania (kontekst AI + wyniki)
- Związek z Polską (⭐⭐⭐⭐⭐ scoring)
- Top głosowania miesiąca (⭐⭐⭐⭐⭐ only)
- Responsive design (balanced desktop + mobile)
- O projekcie (metodologia)

**Dane:**

- Głosowania plenarne (główne sesje)
- Obecność na sesjach
- Podstawowe info o posłach (bio, komisje)

**Częstotliwość:**

- Update co miesiąc po sesji plenarnej
- Batch processing (nie real-time)

**Technologia:**

_Frontend:_

- Next.js 14 (App Router)
- TypeScript
- React 18
- Tailwind CSS
- Radix UI (headless components)

_Backend & Data Processing:_

- Python 3.11+ (scraping & ETL)
- requests, BeautifulSoup4, pandas
- Anthropic Claude API (Sonnet 4 + Haiku 4.5)
- SQLAlchemy (ORM)

_Database:_

- PostgreSQL 15+ (via Supabase)
- Alternative: SQLite (dla MVP lokalnie)

_Hosting & Infrastructure:_

- Vercel (frontend deployment)
- Supabase (managed PostgreSQL)
- Vercel Blob (images/assets)
- GitHub Actions (automation & cron jobs)

_Monitoring:_

- Google Analytics (lub Plausible)
- Sentry (error tracking)
- UptimeRobot (uptime monitoring)

_Development Tools:_

- Git + GitHub
- npm (package management)
- ESLint + Prettier (code quality)
- VSCode

---

### ❌ Co NIE JEST w MVP (defer do v2+):

**Funkcjonalności:**

- User accounts / login
- Komentarze / forum
- Filtering / advanced search
- Export to CSV/PDF
- API publiczne
- Email newsletters
- Porównanie 2 posłów side-by-side
- Historyczne trendy (charts)
- Notifications / alerts

**Dane:**

- Głosowania w komisjach (tylko plenarne na start)
- Szczegółowe transkrypcje wystąpień
- Voting patterns analysis
- Predykcje jak poseł zagłosuje

**Skala:**

- Inne kraje (tylko Polska w MVP)
- Multi-language (tylko PL w MVP)

---

## Non-Goals (Co świadomie NIE robimy)

**❌ Nie jesteśmy:**

- Social media platform
- News aggregator
- Political party tool
- Prediction engine
- Chat forum

**❌ Nie oferujemy:**

- Politycznych rekomendacji (kogo wybierać)
- Ocen moralnych głosowań (dobry/zły)
- Fact-checkingu mediów (focus na PE data)
- Real-time updates (batch miesięczny wystarczy)

**❌ Nie walczymy o:**

- Maksymalny traffic (quality > quantity)
- Viralność za wszelką cenę
- Media buzz (organic growth)
- VC funding (bootstrapped)

---

## Key Assumptions & Risks

### Assumptions (Co zakładamy):

✅ **Problem exists:**

- Content creators naprawdę mają problem z research
- Obywatele chcą transparentności

✅ **Solution works:**

- AI może dobrze wyjaśniać kontekst
- ⭐ scoring będzie pomocny
- Ludzie zaufają źródłu

✅ **Technical feasibility:**

- PE API jest stabilne i dostępne
- Scraping nie zostanie zablokowany
- AI costs są akceptowalne ($6/m)

✅ **Go-to-market:**

- Creators będą chcieli używać za darmo z attribution
- Word-of-mouth będzie działać
- SEO przyniesie organiczny traffic

---

### Risks & Mitigations:

**🔴 HIGH RISK:**

**R1: PE zmienia format danych / API**

- **Mitigation:** Abstraction layer, multiple data sources, monitoring
- **Impact:** High (projekt przestaje działać)
- **Probability:** Low-Medium

**R2: Nikt tego nie używa (no product-market fit)**

- **Mitigation:** Soft launch, early feedback, pivot if needed
- **Impact:** High (marnujemy czas)
- **Probability:** Medium

---

**🟡 MEDIUM RISK:**

**R3: AI halucynuje / niskiej jakości output**

- **Mitigation:** Validation layer, manual spot checks, iteracja promptów
- **Impact:** Medium (reputacja)
- **Probability:** Low

**R4: Konkurent (VoteWatch) robi Polish version**

- **Mitigation:** First mover advantage, better UX, creator relationships
- **Impact:** Medium (trudniej rosnąć)
- **Probability:** Low

**R5: Legal issues (scraping, copyright)**

- **Mitigation:** Use official APIs, public domain data, legal disclaimer
- **Impact:** Medium (musimy zmienić approach)
- **Probability:** Low

---

**🟢 LOW RISK:**

**R6: Hosting costs rosną**

- **Mitigation:** Optimize, cache agresywnie, upgrade tier
- **Impact:** Low (kilkadziesiąt $ więcej)
- **Probability:** Medium

**R7: Burnout (sam robisz wszystko)**

- **Mitigation:** Automation, realistic timeline, 5h/week max
- **Impact:** Low (project paused)
- **Probability:** Medium

---

## Timeline & Milestones

### 🎯 Week 1-2: Foundation

- [ ] Project setup (Next.js, DB, Git)
- [ ] Database schema design
- [ ] First scraper (5 posłów test)
- [ ] AI prompts v1

### 🎯 Week 3-4: Core Build

- [ ] All 53 posłów scraped
- [ ] Basic UI (homepage, profile, vote detail)
- [ ] AI integration working
- [ ] Responsive design (desktop + mobile)

### 🎯 Week 5-6: Polish & Deploy

- [ ] Content pages (about, methodology)
- [ ] Testing & bug fixes
- [ ] Deploy to Vercel
- [ ] Domain setup

### 🎯 Week 7-8: Soft Launch

- [ ] Share with 5-10 friends
- [ ] Gather feedback
- [ ] Iterate based on feedback
- [ ] Fix critical issues

### 🎯 Week 9-12: Public Launch & Growth

- [ ] Public announcement (Twitter, Reddit)
- [ ] Pitch to media
- [ ] SEO optimization
- [ ] Monitor & iterate

### 🎯 Month 4+: Scale

- [ ] Add requested features
- [ ] Improve AI quality
- [ ] Partnerships
- [ ] Monetization (optional)

---

## Open Questions (Do rozstrzygnięcia)

**Product:**

- [ ] Czy dodać dark mode? (nice-to-have)
- [ ] Czy pokazywać historical data (ostatnie 6m, 12m, all time)?
- [ ] Jak często re-scrape'ować (tydzień? miesiąc?)

**Business:**

- [ ] Open source od początku czy później?
- [ ] Free forever czy freemium model?
- [ ] Kiedy zacząć myśleć o monetizacji?

**Technical:**

- [ ] SQLite czy PostgreSQL dla MVP?
- [ ] Self-hosted czy managed DB (Supabase)?
- [ ] Jak długo cachować AI responses?

---

## Related Documents

- `TECH_STACK.md` - Szczegóły technologiczne
- `DATABASE_SCHEMA.md` - Structure bazy danych
- `ROADMAP.md` - Detailed feature roadmap
- `SCRAPING_STRATEGY.md` - How we collect data
- `AI_PROMPTS.md` - AI implementation details
- `ARCHITECTURE.md` - System architecture overview

---

## Changes Log

- **2024-12-10 v0.2:** Updated based on feedback - fixed mobile-first to balanced responsive, added complete tech stack, removed success metrics
- **2024-12-10 v0.1:** Initial version based on conversation with Claude

---

## Contact & Feedback

**Project Owner:** Michał  
**GitHub:** [Link gdy powstanie]  
**Questions:** [Email/Twitter]

**Feedback welcome!** Jeśli widzisz coś do poprawy w tym dokumencie, zgłoś issue lub pull request.

---

_This document is a living document and will evolve as the project progresses._
