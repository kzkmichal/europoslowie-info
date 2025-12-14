# DATABASE_SCHEMA.md

**Status:** Draft  
**Last Updated:** 2024-12-10  
**Owner:** Michał  
**Version:** 0.1

---

## Purpose

Ten dokument definiuje kompletny schema bazy danych dla projektu Europosłowie.info - strukturę tabel, relacje, indeksy, constrainty oraz przykładowe queries.

---

## TL;DR

**Database:** PostgreSQL 15+  
**Tables:** 7 głównych tabel  
**Relationships:** 1:N między MEPs a ich aktywnością  
**Size estimate:** ~50MB w Year 1, ~250MB w Year 5

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CORE ENTITIES                           │
└─────────────────────────────────────────────────────────────────┘

                         ┌──────────────┐
                         │     meps     │
                         │ (53 rows)    │
                         └──────┬───────┘
                                │
                 ┌──────────────┼──────────────┐
                 │              │              │
                 ↓              ↓              ↓
        ┌────────────┐  ┌──────────────┐  ┌─────────────┐
        │  monthly_  │  │   committee_ │  │  questions  │
        │   stats    │  │  memberships │  │             │
        └────────────┘  └──────────────┘  └─────────────┘
                                │
                                ↓
                        ┌──────────────┐
                        │   speeches   │
                        └──────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      VOTING ENTITIES                            │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │ voting_sessions  │
                    │ (12-15/year)     │
                    └────────┬─────────┘
                             │
                             │ 1:N
                             ↓
                    ┌──────────────────┐
                    │      votes       │
                    │ (7,950/month)    │
                    └────────┬─────────┘
                             │
                             │ N:1
                             ↓
                    ┌──────────────────┐
                    │      meps        │
                    └──────────────────┘
```

---

## Table Definitions

### Table 1: `meps` (Members of European Parliament)

**Purpose:** Podstawowe informacje o polskich europosłach

```sql
CREATE TABLE meps (
    -- Primary Key
    id SERIAL PRIMARY KEY,

    -- Unique identifiers
    ep_id INTEGER UNIQUE NOT NULL,  -- Official PE ID
    slug VARCHAR(100) UNIQUE NOT NULL,  -- URL-friendly: "jan-kowalski"

    -- Basic info
    full_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),

    -- Political affiliation
    national_party VARCHAR(100),  -- "PiS", "KO", "Lewica"
    ep_group VARCHAR(100),  -- "ECR", "EPP", "S&D"

    -- Contact & media
    email VARCHAR(255),
    photo_url TEXT,
    website_url TEXT,

    -- Term info
    term_start DATE NOT NULL,
    term_end DATE,
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_ep_id CHECK (ep_id > 0),
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Indexes
CREATE INDEX idx_meps_slug ON meps(slug);
CREATE INDEX idx_meps_ep_group ON meps(ep_group);
CREATE INDEX idx_meps_national_party ON meps(national_party);
CREATE INDEX idx_meps_active ON meps(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE meps IS 'Polish Members of European Parliament';
COMMENT ON COLUMN meps.ep_id IS 'Official European Parliament ID';
COMMENT ON COLUMN meps.slug IS 'URL-friendly identifier for routing';
```

**Example data:**

```sql
INSERT INTO meps (ep_id, slug, full_name, first_name, last_name,
                  national_party, ep_group, term_start, is_active)
VALUES
    (124936, 'jan-kowalski', 'Jan Kowalski', 'Jan', 'Kowalski',
     'PiS', 'ECR', '2024-07-16', true),
    (197490, 'anna-nowak', 'Anna Nowak', 'Anna', 'Nowak',
     'KO', 'EPP', '2024-07-16', true);
```

---

### Table 2: `monthly_stats` (Aggregate Statistics)

**Purpose:** Pre-calculated monthly metrics per MEP (performance optimization)

```sql
CREATE TABLE monthly_stats (
    -- Primary Key
    id SERIAL PRIMARY KEY,

    -- Foreign Key
    mep_id INTEGER NOT NULL REFERENCES meps(id) ON DELETE CASCADE,

    -- Time period
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,  -- 1-12

    -- Voting statistics
    total_votes INTEGER DEFAULT 0,
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    votes_abstain INTEGER DEFAULT 0,
    votes_absent INTEGER DEFAULT 0,

    -- Attendance
    sessions_total INTEGER DEFAULT 0,
    sessions_attended INTEGER DEFAULT 0,
    attendance_rate DECIMAL(5,2),  -- 0.00 - 100.00

    -- Activity counts
    questions_count INTEGER DEFAULT 0,
    speeches_count INTEGER DEFAULT 0,
    reports_count INTEGER DEFAULT 0,

    -- Rankings
    ranking_among_poles INTEGER,  -- 1-53
    ranking_in_group INTEGER,

    -- Poland-relevant voting
    votes_poland_5star INTEGER DEFAULT 0,  -- ⭐⭐⭐⭐⭐
    votes_poland_4star INTEGER DEFAULT 0,  -- ⭐⭐⭐⭐

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(mep_id, year, month),
    CONSTRAINT valid_month CHECK (month BETWEEN 1 AND 12),
    CONSTRAINT valid_year CHECK (year >= 2024),
    CONSTRAINT valid_attendance CHECK (attendance_rate >= 0 AND attendance_rate <= 100)
);

-- Indexes
CREATE INDEX idx_monthly_stats_mep ON monthly_stats(mep_id);
CREATE INDEX idx_monthly_stats_period ON monthly_stats(year DESC, month DESC);
CREATE INDEX idx_monthly_stats_mep_period ON monthly_stats(mep_id, year DESC, month DESC);

-- Comments
COMMENT ON TABLE monthly_stats IS 'Pre-calculated monthly statistics per MEP for performance';
COMMENT ON COLUMN monthly_stats.attendance_rate IS 'Percentage: 0.00 to 100.00';
```

**Example data:**

```sql
INSERT INTO monthly_stats
    (mep_id, year, month, total_votes, votes_for, votes_against,
     sessions_attended, sessions_total, attendance_rate, ranking_among_poles)
VALUES
    (1, 2024, 11, 156, 145, 11, 4, 4, 100.00, 15),
    (2, 2024, 11, 178, 167, 8, 4, 4, 100.00, 8);
```

---

### Table 3: `voting_sessions` (Plenary Sessions)

**Purpose:** Information about parliamentary sessions where voting occurs

```sql
CREATE TABLE voting_sessions (
    -- Primary Key
    id SERIAL PRIMARY KEY,

    -- Session identification
    session_number VARCHAR(50) UNIQUE NOT NULL,  -- "2024-11-I"

    -- Dates
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Location
    location VARCHAR(100),  -- "Strasbourg", "Brussels"

    -- Type
    session_type VARCHAR(50),  -- "plenary", "mini-plenary"

    -- Statistics
    total_votes INTEGER DEFAULT 0,
    total_meps_present INTEGER,

    -- Status
    status VARCHAR(50) DEFAULT 'scheduled',  -- scheduled, ongoing, completed

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_dates CHECK (end_date >= start_date),
    CONSTRAINT valid_status CHECK (status IN ('scheduled', 'ongoing', 'completed'))
);

-- Indexes
CREATE INDEX idx_sessions_date ON voting_sessions(start_date DESC);
CREATE INDEX idx_sessions_status ON voting_sessions(status);

-- Comments
COMMENT ON TABLE voting_sessions IS 'Parliamentary sessions where voting occurs';
```

**Example data:**

```sql
INSERT INTO voting_sessions
    (session_number, start_date, end_date, location, session_type, status)
VALUES
    ('2024-11-I', '2024-11-12', '2024-11-15', 'Strasbourg', 'plenary', 'completed'),
    ('2024-12-I', '2024-12-16', '2024-12-19', 'Strasbourg', 'plenary', 'scheduled');
```

---

### Table 4: `votes` (Individual Voting Records)

**Purpose:** Detailed information about each vote (largest table)

```sql
CREATE TABLE votes (
    -- Primary Key
    id SERIAL PRIMARY KEY,

    -- Foreign Keys
    session_id INTEGER NOT NULL REFERENCES voting_sessions(id) ON DELETE CASCADE,
    mep_id INTEGER NOT NULL REFERENCES meps(id) ON DELETE CASCADE,

    -- Vote identification
    vote_number VARCHAR(50),  -- Official PE vote number
    title TEXT NOT NULL,
    title_en TEXT,  -- English title (from PE)

    -- Vote details
    date DATE NOT NULL,
    vote_choice VARCHAR(20) NOT NULL,  -- 'FOR', 'AGAINST', 'ABSTAIN', 'ABSENT'

    -- Results
    result VARCHAR(20),  -- 'ADOPTED', 'REJECTED'
    votes_for INTEGER,
    votes_against INTEGER,
    votes_abstain INTEGER,

    -- Document references
    document_reference VARCHAR(100),  -- "COM(2024)123"
    document_url TEXT,

    -- AI-generated content
    context_ai TEXT,  -- Explanation in Polish (AI-generated)

    -- Poland relevance (⭐ system)
    stars_poland INTEGER,  -- 1-5
    stars_reasoning JSONB,  -- ["Polska wymieniona 7x", "Wpływ: 2.3 mld EUR"]

    -- Arguments (AI-extracted)
    arguments_for JSONB,  -- ["Argument 1", "Argument 2", ...]
    arguments_against JSONB,

    -- How Poles voted
    polish_votes_for INTEGER DEFAULT 0,
    polish_votes_against INTEGER DEFAULT 0,
    polish_votes_abstain INTEGER DEFAULT 0,
    polish_votes_absent INTEGER DEFAULT 0,

    -- Categories
    topic_category VARCHAR(100),  -- "budget", "environment", "security"
    policy_area VARCHAR(100),  -- More specific categorization

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(session_id, mep_id, vote_number),
    CONSTRAINT valid_vote_choice CHECK (
        vote_choice IN ('FOR', 'AGAINST', 'ABSTAIN', 'ABSENT')
    ),
    CONSTRAINT valid_result CHECK (
        result IN ('ADOPTED', 'REJECTED', 'TIED')
    ),
    CONSTRAINT valid_stars CHECK (
        stars_poland IS NULL OR (stars_poland >= 1 AND stars_poland <= 5)
    )
);

-- Indexes (critical for performance)
CREATE INDEX idx_votes_mep ON votes(mep_id);
CREATE INDEX idx_votes_session ON votes(session_id);
CREATE INDEX idx_votes_date ON votes(date DESC);
CREATE INDEX idx_votes_stars ON votes(stars_poland DESC) WHERE stars_poland >= 4;
CREATE INDEX idx_votes_mep_stars ON votes(mep_id, stars_poland DESC);
CREATE INDEX idx_votes_category ON votes(topic_category);

-- Full-text search index (future feature)
CREATE INDEX idx_votes_title_search ON votes USING gin(to_tsvector('english', title));

-- Comments
COMMENT ON TABLE votes IS 'Individual voting records - largest table';
COMMENT ON COLUMN votes.stars_poland IS 'Poland relevance: 1 (low) to 5 (critical)';
COMMENT ON COLUMN votes.context_ai IS 'AI-generated explanation in simple Polish';
```

**Example data:**

```sql
INSERT INTO votes
    (session_id, mep_id, vote_number, title, date, vote_choice,
     result, votes_for, votes_against, stars_poland,
     stars_reasoning, context_ai, topic_category)
VALUES
    (1, 1, 'PV-247', 'Budżet UE 2025', '2024-11-12', 'FOR',
     'ADOPTED', 487, 123,
     5,
     '["Polska wymieniona 12x w dokumencie", "Fundusz Spójności: +1.8 mld EUR"]'::jsonb,
     'Głosowanie nad budżetem Unii Europejskiej na 2025 rok. Kluczowa zmiana to zwiększenie Funduszu Spójności o 12%, co bezpośrednio wpływa na Polskę jako głównego beneficjenta.',
     'budget');
```

---

### Table 5: `questions` (Parliamentary Questions)

**Purpose:** Questions submitted by MEPs to EU institutions

```sql
CREATE TABLE questions (
    -- Primary Key
    id SERIAL PRIMARY KEY,

    -- Foreign Key
    mep_id INTEGER NOT NULL REFERENCES meps(id) ON DELETE CASCADE,

    -- Question details
    question_number VARCHAR(50) UNIQUE,  -- Official PE number
    subject TEXT NOT NULL,
    question_text TEXT NOT NULL,

    -- Addressed to
    addressed_to VARCHAR(100),  -- "Commission", "Council", "High Representative"

    -- Dates
    date_submitted DATE NOT NULL,
    date_answered DATE,

    -- Answer
    answer_text TEXT,
    answered_by VARCHAR(255),

    -- AI analysis (optional)
    quality_score INTEGER,  -- 1-10 (AI-assessed quality)
    topics JSONB,  -- ["energy", "climate"]

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_quality CHECK (
        quality_score IS NULL OR (quality_score >= 1 AND quality_score <= 10)
    )
);

-- Indexes
CREATE INDEX idx_questions_mep ON questions(mep_id);
CREATE INDEX idx_questions_date ON questions(date_submitted DESC);
CREATE INDEX idx_questions_answered ON questions(date_answered) WHERE date_answered IS NOT NULL;

-- Comments
COMMENT ON TABLE questions IS 'Parliamentary questions submitted by MEPs';
COMMENT ON COLUMN questions.quality_score IS 'AI-assessed quality: 1 (poor) to 10 (excellent)';
```

**Example data:**

```sql
INSERT INTO questions
    (mep_id, question_number, subject, question_text, addressed_to, date_submitted)
VALUES
    (1, 'E-001234/2024', 'Termin wypłaty środków z KPO',
     'Kiedy Polska otrzyma kolejną transzę środków z Krajowego Planu Odbudowy?',
     'Commission', '2024-11-10');
```

---

### Table 6: `speeches` (Parliamentary Speeches)

**Purpose:** Speeches/interventions during debates

```sql
CREATE TABLE speeches (
    -- Primary Key
    id SERIAL PRIMARY KEY,

    -- Foreign Key
    mep_id INTEGER NOT NULL REFERENCES meps(id) ON DELETE CASCADE,

    -- Speech details
    debate_topic TEXT NOT NULL,
    speech_date DATE NOT NULL,
    duration_seconds INTEGER,  -- Length in seconds

    -- Content
    transcript TEXT,  -- Full transcript (if available)
    video_url TEXT,

    -- AI analysis
    main_points JSONB,  -- ["Point 1", "Point 2", ...]
    tone VARCHAR(50),  -- "supportive", "critical", "neutral"
    topics JSONB,  -- ["budget", "environment"]

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_duration CHECK (duration_seconds > 0)
);

-- Indexes
CREATE INDEX idx_speeches_mep ON speeches(mep_id);
CREATE INDEX idx_speeches_date ON speeches(speech_date DESC);

-- Comments
COMMENT ON TABLE speeches IS 'Parliamentary speeches and interventions';
```

**Example data:**

```sql
INSERT INTO speeches
    (mep_id, debate_topic, speech_date, duration_seconds,
     main_points, tone)
VALUES
    (1, 'Budżet UE 2025 - debata', '2024-11-12', 300,
     '["Krytyka cięć w Funduszu Spójności", "Apel o zwiększenie środków na rolnictwo"]'::jsonb,
     'critical');
```

---

### Table 7: `committee_memberships` (Committee Assignments)

**Purpose:** MEP memberships in parliamentary committees

```sql
CREATE TABLE committee_memberships (
    -- Primary Key
    id SERIAL PRIMARY KEY,

    -- Foreign Key
    mep_id INTEGER NOT NULL REFERENCES meps(id) ON DELETE CASCADE,

    -- Committee details
    committee_code VARCHAR(20) NOT NULL,  -- "AGRI", "ENVI", "BUDG"
    committee_name VARCHAR(255) NOT NULL,
    committee_name_en VARCHAR(255),

    -- Role
    role VARCHAR(50) DEFAULT 'member',  -- "member", "substitute", "chair", "vice-chair"

    -- Period
    from_date DATE NOT NULL,
    to_date DATE,
    is_current BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_role CHECK (
        role IN ('member', 'substitute', 'chair', 'vice-chair')
    ),
    CONSTRAINT valid_dates CHECK (
        to_date IS NULL OR to_date >= from_date
    )
);

-- Indexes
CREATE INDEX idx_committee_mep ON committee_memberships(mep_id);
CREATE INDEX idx_committee_current ON committee_memberships(is_current)
    WHERE is_current = true;
CREATE INDEX idx_committee_code ON committee_memberships(committee_code);

-- Comments
COMMENT ON TABLE committee_memberships IS 'MEP assignments to parliamentary committees';
```

**Example data:**

```sql
INSERT INTO committee_memberships
    (mep_id, committee_code, committee_name, role, from_date, is_current)
VALUES
    (1, 'AGRI', 'Komisja Rolnictwa i Rozwoju Wsi', 'member', '2024-07-16', true),
    (1, 'ENVI', 'Komisja Ochrony Środowiska', 'substitute', '2024-07-16', true);
```

---

## Relationships Summary

```sql
-- One-to-Many relationships

meps (1) ←→ (N) monthly_stats
meps (1) ←→ (N) votes
meps (1) ←→ (N) questions
meps (1) ←→ (N) speeches
meps (1) ←→ (N) committee_memberships

voting_sessions (1) ←→ (N) votes
```

---

## Database Size Estimates

### Year 1 (First 12 months)

```
meps:                53 rows × 1 KB    = 53 KB
monthly_stats:       636 rows × 2 KB   = 1.3 MB
voting_sessions:     150 rows × 5 KB   = 750 KB
votes:               95,400 rows × 500 B = 47.7 MB
questions:           3,180 rows × 2 KB  = 6.4 MB
speeches:            1,908 rows × 3 KB  = 5.7 MB
committee_memberships: 200 rows × 1 KB = 200 KB
──────────────────────────────────────────────
TOTAL:               ~62 MB

With indexes:        ~80 MB
With overhead:       ~100 MB
```

### Year 5 Projection

```
Assuming consistent activity:
Year 1: 100 MB
Year 2: 200 MB
Year 3: 300 MB
Year 4: 400 MB
Year 5: 500 MB

Still within Supabase free tier (500 MB)!
```

---

## Common Queries

### Query 1: Get MEP Profile with Stats

```sql
-- Get MEP basic info + last 12 months of stats
SELECT
    m.id,
    m.full_name,
    m.slug,
    m.national_party,
    m.ep_group,
    m.photo_url,
    json_agg(
        json_build_object(
            'year', ms.year,
            'month', ms.month,
            'attendance_rate', ms.attendance_rate,
            'total_votes', ms.total_votes,
            'ranking_among_poles', ms.ranking_among_poles
        ) ORDER BY ms.year DESC, ms.month DESC
    ) as monthly_stats
FROM meps m
LEFT JOIN monthly_stats ms ON m.id = ms.mep_id
WHERE m.slug = 'jan-kowalski'
    AND m.is_active = true
GROUP BY m.id;
```

**Performance:** ~10-20ms with indexes

---

### Query 2: Get Top Votes for MEP

```sql
-- Get top 10 Poland-relevant votes for a specific MEP
SELECT
    v.id,
    v.title,
    v.date,
    v.vote_choice,
    v.result,
    v.stars_poland,
    v.context_ai,
    v.polish_votes_for,
    v.polish_votes_against,
    vs.session_number
FROM votes v
JOIN voting_sessions vs ON v.session_id = vs.id
WHERE v.mep_id = 1
    AND v.stars_poland >= 4  -- Only ⭐⭐⭐⭐ and ⭐⭐⭐⭐⭐
ORDER BY v.stars_poland DESC, v.date DESC
LIMIT 10;
```

**Performance:** ~5-10ms with indexes

---

### Query 3: Get Vote Details with All Polish MEPs

```sql
-- Get detailed info about one vote + how all Poles voted
SELECT
    v.id,
    v.title,
    v.date,
    v.vote_choice,
    v.result,
    v.stars_poland,
    v.context_ai,
    v.arguments_for,
    v.arguments_against,
    -- Aggregate Polish votes
    (
        SELECT json_agg(
            json_build_object(
                'name', m.full_name,
                'party', m.national_party,
                'vote', v2.vote_choice
            ) ORDER BY m.national_party, m.last_name
        )
        FROM votes v2
        JOIN meps m ON v2.mep_id = m.id
        WHERE v2.session_id = v.session_id
            AND v2.vote_number = v.vote_number
            AND m.is_active = true
    ) as polish_meps_votes
FROM votes v
WHERE v.id = 1234;
```

**Performance:** ~20-30ms

---

### Query 4: Get Monthly Top Votes (Homepage)

```sql
-- Get top votes from last month (⭐⭐⭐⭐⭐ only)
SELECT
    v.id,
    v.title,
    v.date,
    v.result,
    v.stars_poland,
    v.context_ai,
    v.polish_votes_for,
    v.polish_votes_against,
    v.topic_category,
    vs.session_number
FROM votes v
JOIN voting_sessions vs ON v.session_id = vs.id
WHERE v.stars_poland = 5
    AND v.date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    AND v.date < DATE_TRUNC('month', CURRENT_DATE)
GROUP BY v.id, v.title, v.date, v.result, v.stars_poland,
         v.context_ai, v.polish_votes_for, v.polish_votes_against,
         v.topic_category, vs.session_number
ORDER BY v.date DESC;
```

**Performance:** ~15-25ms with index on `(stars_poland, date)`

---

### Query 5: Calculate Rankings

```sql
-- Calculate MEP rankings for a given month
WITH mep_activity AS (
    SELECT
        m.id,
        m.full_name,
        COUNT(v.id) as total_votes,
        COUNT(CASE WHEN v.vote_choice = 'FOR' THEN 1 END) as votes_for,
        COUNT(CASE WHEN v.vote_choice = 'AGAINST' THEN 1 END) as votes_against,
        COUNT(CASE WHEN v.vote_choice = 'ABSTAIN' THEN 1 END) as votes_abstain,
        COUNT(CASE WHEN v.vote_choice = 'ABSENT' THEN 1 END) as votes_absent,
        COUNT(q.id) as questions_count,
        COUNT(s.id) as speeches_count
    FROM meps m
    LEFT JOIN votes v ON m.id = v.mep_id
        AND DATE_TRUNC('month', v.date) = '2024-11-01'
    LEFT JOIN questions q ON m.id = q.mep_id
        AND DATE_TRUNC('month', q.date_submitted) = '2024-11-01'
    LEFT JOIN speeches s ON m.id = s.mep_id
        AND DATE_TRUNC('month', s.speech_date) = '2024-11-01'
    WHERE m.is_active = true
    GROUP BY m.id, m.full_name
),
ranked AS (
    SELECT
        *,
        RANK() OVER (ORDER BY total_votes DESC) as ranking
    FROM mep_activity
)
SELECT * FROM ranked
ORDER BY ranking;
```

**Performance:** ~50-100ms (run monthly, cache results)

---

### Query 6: Search Votes by Text

```sql
-- Full-text search in vote titles (future feature)
SELECT
    v.id,
    v.title,
    v.date,
    v.stars_poland,
    ts_rank(to_tsvector('english', v.title), query) as rank
FROM votes v,
     to_tsquery('english', 'budget & agriculture') as query
WHERE to_tsvector('english', v.title) @@ query
ORDER BY rank DESC
LIMIT 20;
```

---

## Views (Optional - for convenience)

### View 1: `active_meps_summary`

```sql
CREATE VIEW active_meps_summary AS
SELECT
    m.id,
    m.slug,
    m.full_name,
    m.national_party,
    m.ep_group,
    m.photo_url,
    -- Latest stats
    (SELECT attendance_rate
     FROM monthly_stats
     WHERE mep_id = m.id
     ORDER BY year DESC, month DESC
     LIMIT 1) as latest_attendance,
    (SELECT ranking_among_poles
     FROM monthly_stats
     WHERE mep_id = m.id
     ORDER BY year DESC, month DESC
     LIMIT 1) as latest_ranking,
    -- Total counts
    (SELECT COUNT(*) FROM votes WHERE mep_id = m.id) as total_votes,
    (SELECT COUNT(*) FROM questions WHERE mep_id = m.id) as total_questions,
    (SELECT COUNT(*) FROM speeches WHERE mep_id = m.id) as total_speeches
FROM meps m
WHERE m.is_active = true;

-- Usage
SELECT * FROM active_meps_summary ORDER BY latest_ranking;
```

---

## Migrations Strategy

### Using Alembic (Python)

```python
# alembic/versions/001_initial_schema.py

def upgrade():
    # Create meps table
    op.create_table(
        'meps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ep_id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        # ... rest of columns
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ep_id'),
        sa.UniqueConstraint('slug')
    )

    # Create indexes
    op.create_index('idx_meps_slug', 'meps', ['slug'])

    # ... create other tables

def downgrade():
    op.drop_table('meps')
```

**Migration commands:**

```bash
# Generate migration
alembic revision --autogenerate -m "Initial schema"

# Apply migration
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## Data Validation Rules

### Validation at Application Layer

```python
# Python validation using Pydantic

from pydantic import BaseModel, Field, validator
from datetime import date

class MEPCreate(BaseModel):
    ep_id: int = Field(gt=0)
    slug: str = Field(regex=r'^[a-z0-9-]+$', max_length=100)
    full_name: str = Field(min_length=3, max_length=255)
    national_party: str
    ep_group: str
    term_start: date

    @validator('slug')
    def slug_must_be_lowercase(cls, v):
        if not v.islower():
            raise ValueError('Slug must be lowercase')
        return v

class VoteCreate(BaseModel):
    session_id: int
    mep_id: int
    title: str = Field(min_length=5)
    date: date
    vote_choice: str = Field(regex=r'^(FOR|AGAINST|ABSTAIN|ABSENT)$')
    stars_poland: int = Field(ge=1, le=5, nullable=True)

    @validator('date')
    def date_not_in_future(cls, v):
        if v > date.today():
            raise ValueError('Vote date cannot be in future')
        return v
```

---

## Backup Strategy

### Automated Backups (Supabase)

```
Daily backups (automatic):
- Full database dump
- Retained for 7 days
- Point-in-time recovery available

Weekly manual backups:
- Export via pg_dump
- Store in GitHub repo (compressed)
- Retain indefinitely
```

### Manual Backup Command

```bash
# Export full database
pg_dump $DATABASE_URL > backups/europosel_$(date +%Y%m%d).sql

# Compress
gzip backups/europosel_$(date +%Y%m%d).sql

# Restore
gunzip backups/europosel_20241210.sql.gz
psql $DATABASE_URL < backups/europosel_20241210.sql
```

---

## Performance Optimization

### Indexing Strategy

```sql
-- Critical indexes (already defined above)
-- Rule: Index foreign keys and frequently queried columns

-- Query analysis
EXPLAIN ANALYZE
SELECT * FROM votes
WHERE mep_id = 1 AND stars_poland >= 4
ORDER BY date DESC
LIMIT 10;

-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Query Optimization Tips

```sql
-- ✅ GOOD: Use indexes
SELECT * FROM votes
WHERE mep_id = 1  -- indexed
    AND stars_poland >= 4  -- indexed
ORDER BY date DESC  -- indexed
LIMIT 10;

-- ❌ BAD: Full table scan
SELECT * FROM votes
WHERE LOWER(title) LIKE '%budget%'  -- not indexed
ORDER BY id;  -- not meaningful

-- ✅ BETTER: Full-text search
SELECT * FROM votes
WHERE to_tsvector('english', title) @@ to_tsquery('budget')  -- indexed (GIN)
ORDER BY date DESC;
```

---

## Data Integrity

### Referential Integrity

```sql
-- All foreign keys use CASCADE for consistency
-- If MEP is deleted, all their data is deleted

-- Example:
ALTER TABLE votes
ADD CONSTRAINT fk_votes_mep
FOREIGN KEY (mep_id)
REFERENCES meps(id)
ON DELETE CASCADE;  -- ← Important!
```

### Data Consistency Checks

```sql
-- Check 1: No orphaned votes
SELECT COUNT(*) as orphaned_votes
FROM votes v
LEFT JOIN meps m ON v.mep_id = m.id
WHERE m.id IS NULL;
-- Expected: 0

-- Check 2: Vote totals match
SELECT
    v.id,
    v.title,
    v.votes_for + v.votes_against + v.votes_abstain as calculated_total,
    (SELECT COUNT(*) FROM votes v2
     WHERE v2.session_id = v.session_id
       AND v2.vote_number = v.vote_number) as actual_total
FROM votes v
WHERE v.votes_for IS NOT NULL
HAVING calculated_total != actual_total;
-- Expected: 0 rows

-- Check 3: Attendance rate calculation
SELECT
    mep_id,
    year,
    month,
    attendance_rate,
    ROUND(100.0 * sessions_attended / NULLIF(sessions_total, 0), 2) as calculated
FROM monthly_stats
WHERE ABS(attendance_rate - calculated) > 0.01;
-- Expected: 0 rows (allowing for rounding)
```

---

## Seed Data (Development)

```sql
-- Minimal seed data for testing

BEGIN;

-- Insert test MEPs
INSERT INTO meps (ep_id, slug, full_name, first_name, last_name,
                  national_party, ep_group, term_start, is_active)
VALUES
    (1, 'jan-kowalski', 'Jan Kowalski', 'Jan', 'Kowalski',
     'PiS', 'ECR', '2024-07-16', true),
    (2, 'anna-nowak', 'Anna Nowak', 'Anna', 'Nowak',
     'KO', 'EPP', '2024-07-16', true),
    (3, 'piotr-wisniewski', 'Piotr Wiśniewski', 'Piotr', 'Wiśniewski',
     'Lewica', 'S&D', '2024-07-16', true);

-- Insert test session
INSERT INTO voting_sessions (session_number, start_date, end_date,
                              location, session_type, status)
VALUES ('2024-11-TEST', '2024-11-01', '2024-11-04',
        'Strasbourg', 'plenary', 'completed');

-- Insert test votes
INSERT INTO votes (session_id, mep_id, vote_number, title, date,
                   vote_choice, result, stars_poland, context_ai)
VALUES
    (1, 1, 'TEST-001', 'Test Vote: Budget', '2024-11-01',
     'FOR', 'ADOPTED', 5, 'Test context'),
    (1, 2, 'TEST-001', 'Test Vote: Budget', '2024-11-01',
     'FOR', 'ADOPTED', 5, 'Test context'),
    (1, 3, 'TEST-001', 'Test Vote: Budget', '2024-11-01',
     'AGAINST', 'ADOPTED', 5, 'Test context');

COMMIT;
```

---

## Related Documents

- `PROJECT_OVERVIEW.md` - Project goals and scope
- `TECH_STACK.md` - Technology choices
- `ARCHITECTURE.md` - System architecture
- `SCRAPING_STRATEGY.md` - How data is collected
- `AI_PROMPTS.md` - How AI enriches data

---

## Changes Log

- **2024-12-10 v0.1:** Initial database schema documentation

---

_This is a living document. Update as schema evolves._
