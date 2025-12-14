# SETUP_GUIDE.md

**Status:** Draft  
**Last Updated:** 2024-12-10  
**Owner:** Michał  
**Version:** 0.2

---

## Purpose

Ten dokument zawiera step-by-step instrukcje jak skonfigurować i uruchomić projekt Europosłowie.info lokalnie na swoim komputerze.

---

## TL;DR (Quick Start)

```bash
# 1. Clone & Install
git clone https://github.com/yourusername/europoslowie-info.git
cd europoslowie-info
npm install
python -m venv venv && source venv/bin/activate && pip install -r requirements.txt

# 2. Setup Database (Docker)
docker run -d --name europosel-db -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:15

# 3. Configure
cp .env.example .env.local
# Edit .env.local with your keys

# 4. Initialize Database
npm run db:migrate
npm run db:seed

# 5. Run
npm run dev
# Visit http://localhost:3000
```

---

## Prerequisites

### Required Software

**1. Node.js 20.x or higher**

```bash
# Check version
node --version  # Should be v20.x.x or higher

# Install (macOS)
brew install node@20

# Install (Windows)
# Download from https://nodejs.org/

# Install (Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Why Node 20?**

- Next.js 14 requires Node 18.17+
- Node 20 LTS provides best stability
- Native support for fetch API

---

**2. Python 3.11 or higher**

```bash
# Check version
python --version  # Should be 3.11.x or higher

# Install (macOS)
brew install python@3.11

# Install (Windows)
# Download from https://www.python.org/downloads/

# Install (Ubuntu)
sudo apt update
sudo apt install python3.11 python3.11-venv python3.11-dev
```

**Why Python 3.11?**

- Better performance than 3.10 (up to 25% faster)
- Improved error messages (easier debugging)
- Type hints improvements (better IDE support)
- Latest library compatibility

---

**3. PostgreSQL 15 or higher**

**Option A: Docker (Recommended)**

```bash
# Check Docker installed
docker --version

# Install Docker Desktop
# macOS/Windows: https://www.docker.com/products/docker-desktop
# Ubuntu: sudo apt install docker.io
```

**Option B: Local PostgreSQL**

```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Windows
# Download installer from https://www.postgresql.org/download/windows/

# Ubuntu
sudo apt install postgresql-15 postgresql-contrib-15
sudo systemctl start postgresql
```

**Why PostgreSQL 15?**

- Latest stable version
- JSON improvements
- Better performance
- Required by Supabase compatibility

---

**4. Git**

```bash
# Check version
git --version

# Install (macOS)
brew install git

# Install (Windows)
# Download from https://git-scm.com/

# Install (Ubuntu)
sudo apt install git
```

---

### Package Manager: npm vs pnpm

**Dla tego projektu używamy: npm** ✅

**Dlaczego npm?**

- ✅ Built-in z Node.js (zero extra setup)
- ✅ Najpopularniejszy (każdy developer zna)
- ✅ Stabilny (battle-tested)
- ✅ Vercel compatible (domyślnie używa npm)
- ✅ Portfolio friendly (standardowy wybór)

**Co z pnpm/yarn?**

- pnpm jest szybszy (~2x) ale wymaga extra setup
- Dla single project MVP różnica nie ma znaczenia
- Możesz zmienić później jeśli będzie potrzeba

**Comparison:**

```
┌──────────────┬─────────┬─────────┐
│              │   npm   │  pnpm   │
├──────────────┼─────────┼─────────┤
│ Szybkość     │   ⭐⭐   │  ⭐⭐⭐⭐ │
│ Popularność  │  ⭐⭐⭐⭐ │   ⭐⭐   │
│ Stabilność   │  ⭐⭐⭐⭐ │  ⭐⭐⭐   │
│ Zero config  │  ⭐⭐⭐⭐ │  ⭐⭐⭐   │
└──────────────┴─────────┴─────────┘
```

**Verdict:** npm jest najlepszym wyborem dla tego projektu.

---

### Optional but Recommended

**1. Docker Desktop**

- Simplifies database setup
- Useful for testing deployment
- Download: https://www.docker.com/products/docker-desktop

**2. VSCode**

- Best IDE for this stack
- Download: https://code.visualstudio.com/

**3. Database GUI Tool**

- **Postico** (macOS) - https://eggerapps.at/postico/
- **pgAdmin** (all platforms) - https://www.pgadmin.org/
- **DBeaver** (all platforms) - https://dbeaver.io/

---

## Step 1: Clone Repository

```bash
# Clone the repo
git clone https://github.com/yourusername/europoslowie-info.git

# Navigate to project
cd europoslowie-info

# Check files are there
ls -la
# Should see: package.json, requirements.txt, README.md, etc.
```

---

## Step 2: Install Dependencies

### Understanding the Setup

**WAŻNE:** Ten krok zakłada że projekt Next.js został już utworzony (przez Ciebie lub przez `create-next-app`).

**Struktura projektu który klonujesz:**

```
europoslowie-info/
├── package.json          ← Definicja frontend dependencies (Next.js, React, etc.)
├── requirements.txt      ← Definicja Python dependencies (scrapers, AI)
├── app/                  ← Next.js app (już istnieje w repo)
├── scripts/              ← Python scrapers (już istnieją w repo)
├── components/           ← React components (już istnieją)
└── ... (inne pliki konfiguracyjne)
```

**Co robisz teraz:**

- Nie tworzysz projektu od zera
- Instalujesz dependencies na podstawie `package.json` i `requirements.txt`
- Przygotowujesz środowisko do uruchomienia istniejącego kodu

---

### Frontend Dependencies (Node.js)

```bash
# Instalacja wszystkich pakietów z package.json
npm install

# To pobiera i instaluje ~342 pakiety:
# - Next.js 14 (framework)
# - React 18 (UI library)
# - TypeScript (type safety)
# - Tailwind CSS (styling)
# - Radix UI (components)
# - i wszystkie inne dependencies

# Tworzy folder node_modules/ (~500MB)
```

**Co się dzieje podczas `npm install`:**

```
1. npm czyta package.json
2. Pobiera pakiety z npmjs.com
3. Tworzy folder node_modules/ z 342 pakietami
4. Zapisuje dokładne wersje w package-lock.json
```

**Struktura PO instalacji:**

```
europoslowie-info/
├── node_modules/         ← NOWY FOLDER (~500MB)
│   ├── next/
│   ├── react/
│   ├── typescript/
│   └── ... (339 innych pakietów)
├── package.json
├── package-lock.json     ← Zaktualizowany
└── ...
```

**Verify installation:**

```bash
npm list --depth=0
```

**Expected output:**

```
europoslowie-info@0.1.0
├── next@14.1.0
├── react@18.2.0
├── typescript@5.3.3
├── tailwindcss@3.4.1
├── @radix-ui/react-dialog@1.0.5
└── ... (other packages)
```

---

### Backend Dependencies (Python - dla scrapingu danych)

**Python jest używany do:**

- 🔍 **Scrapingu danych** z Parlamentu Europejskiego
- 📊 **Przetwarzania danych** (pandas, data cleaning)
- 🤖 **Integracji z AI** (Anthropic Claude API)
- 🔄 **ETL pipeline** (Extract, Transform, Load)

---

#### Krok 1: Sprawdź Python

```bash
# Sprawdź czy Python jest zainstalowany
python --version
# lub
python3 --version

# Powinno pokazać: Python 3.11.x lub wyżej

# Jeśli NIE masz Pythona 3.11+, zainstaluj:
```

**macOS:**

```bash
# Używając Homebrew (zalecane)
brew install python@3.11

# Sprawdź instalację
python3.11 --version

# Ustaw jako domyślny (opcjonalne)
echo 'alias python=python3.11' >> ~/.zshrc
source ~/.zshrc
```

**Windows:**

```powershell
# 1. Pobierz installer z:
# https://www.python.org/downloads/

# 2. Podczas instalacji KONIECZNIE ZAZNACZ:
# ☑ Add Python to PATH (WAŻNE!)
# ☑ Install pip
# ☑ Install for all users (opcjonalne)

# 3. Po instalacji, otwórz NOWY terminal i sprawdź:
python --version
# Powinno pokazać: Python 3.11.x

# Jeśli pokazuje starszą wersję (3.9, 3.10):
py -3.11 --version  # Sprawdź czy 3.11 jest dostępny
```

**Ubuntu/Debian:**

```bash
# Dodaj PPA dla nowszego Pythona
sudo apt update
sudo apt install software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa

# Zainstaluj Python 3.11
sudo apt install python3.11 python3.11-venv python3.11-dev

# Sprawdź instalację
python3.11 --version

# Ustaw jako domyślny (opcjonalne)
sudo update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1
```

---

#### Krok 2: Utwórz Virtual Environment

**Co to jest virtual environment i po co?**

Virtual environment to **izolowane środowisko** dla pakietów Python.

**Bez virtual environment:**

- ❌ Pakiety instalują się globalnie (bałagan w systemie)
- ❌ Konflikty wersji między różnymi projektami
- ❌ Trudno zarządzać zależnościami
- ❌ Ciężko przenieść projekt na inny komputer

**Z virtual environment:**

- ✅ Każdy projekt ma własne pakiety
- ✅ Zero konfliktów między projektami
- ✅ Łatwe zarządzanie przez `requirements.txt`
- ✅ Reprodukowalny setup (inni devs mogą łatwo uruchomić)

```bash
# Przejdź do folderu projektu (jeśli nie jesteś)
cd europoslowie-info

# Utwórz virtual environment (folder "venv")
python -m venv venv
# lub jeśli masz wiele wersji Pythona:
python3.11 -m venv venv

# To tworzy folder venv/ z:
# - Kopią interpretera Python
# - pip (package manager)
# - Izolowanym site-packages/ (tu będą pakiety)
```

**Struktura po utworzeniu venv:**

```
europoslowie-info/
├── venv/                 ← NOWY FOLDER
│   ├── bin/              (macOS/Linux)
│   │   ├── python        ← Python dla tego projektu
│   │   ├── pip           ← pip dla tego projektu
│   │   └── activate      ← Skrypt aktywacji
│   ├── Scripts/          (Windows zamiast bin/)
│   │   ├── python.exe
│   │   ├── pip.exe
│   │   └── activate.bat
│   ├── lib/
│   │   └── python3.11/
│   │       └── site-packages/  ← Tutaj będą pakiety
│   └── pyvenv.cfg
├── scripts/              ← Twoje skrypty scrapingowe
├── node_modules/         ← Node.js packages
├── package.json
├── requirements.txt
└── ...
```

---

#### Krok 3: Aktywuj Virtual Environment

**WAŻNE:** Musisz aktywować venv przed każdym użyciem Pythona w projekcie!

**macOS/Linux:**

```bash
# Aktywuj
source venv/bin/activate

# Twój prompt zmieni się na:
(venv) user@computer:~/europoslowie-info$
#  ↑ Ta "etykietka" pokazuje że venv jest aktywny

# Dezaktywuj (jak skończysz pracę)
deactivate
```

**Windows (Command Prompt):**

```cmd
# Aktywuj
venv\Scripts\activate.bat

# Prompt zmieni się na:
(venv) C:\Users\User\europoslowie-info>

# Dezaktywuj
deactivate
```

**Windows (PowerShell):**

```powershell
# NAJPIERW: Pozwól na wykonywanie skryptów (raz, jako Admin)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Potem aktywuj normalnie:
venv\Scripts\Activate.ps1

# Prompt:
(venv) PS C:\Users\User\europoslowie-info>

# Dezaktywuj
deactivate
```

**Jak sprawdzić że venv działa?**

```bash
# Po aktywacji sprawdź:
which python  # macOS/Linux
# Powinno pokazać:
# /path/to/europoslowie-info/venv/bin/python

# Windows:
where python
# Powinno pokazać:
# C:\Users\...\europoslowie-info\venv\Scripts\python.exe

# Sprawdź pip:
which pip  # lub: where pip
# Powinno być w venv/, NIE w globalnym Pythonie
```

---

#### Krok 4: Zainstaluj Pakiety Python

```bash
# WAŻNE: Upewnij się że venv jest aktywny!
# (powinieneś widzieć (venv) w prompcie)

# 1. Upgrade pip do najnowszej wersji (zalecane)
pip install --upgrade pip

# 2. Zainstaluj wszystkie pakiety z requirements.txt
pip install -r requirements.txt

# To instaluje ~23 pakiety dla scrapingu i AI:
# - requests (HTTP client dla scrapingu)
# - beautifulsoup4 + lxml (parsowanie HTML/XML)
# - pandas + numpy (przetwarzanie danych)
# - sqlalchemy + psycopg2 (database ORM + PostgreSQL driver)
# - anthropic (Claude AI API)
# - tenacity (retry logic)
# - python-dotenv (environment variables)
# - pydantic (data validation)
# - alembic (database migrations)
# - pytest (testing)
# ... i więcej
```

**Co zawiera `requirements.txt`?**

```txt
# Core scraping
requests==2.31.0
beautifulsoup4==4.12.3
lxml==5.1.0

# Data processing
pandas==2.1.4
numpy==1.26.3

# Database
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
alembic==1.13.1

# AI
anthropic==0.18.1

# Utilities
python-dotenv==1.0.0
pydantic==2.5.3
tenacity==8.2.3

# Testing
pytest==7.4.4
pytest-cov==4.1.0

# Development
black==23.12.1
flake8==7.0.0
```

**Weryfikacja instalacji:**

```bash
# Sprawdź zainstalowane pakiety
pip list

# Powinno pokazać:
# Package           Version
# ----------------- -------
# anthropic         0.18.1
# beautifulsoup4    4.12.3
# pandas            2.1.4
# requests          2.31.0
# sqlalchemy        2.0.25
# ... (i więcej, ~23 pakiety)

# Sprawdź konkretny pakiet
pip show requests

# Test importu (sprawdź czy pakiety działają)
python -c "import requests; print('requests OK')"
python -c "import pandas; print('pandas OK')"
python -c "import anthropic; print('anthropic OK')"
python -c "import sqlalchemy; print('sqlalchemy OK')"

# Jeśli wszystkie wypisują "OK" - wszystko działa!
```

---

#### Troubleshooting - Częste problemy z Pythonem

**Problem 1: `lxml` instalacja się nie udaje**

```
ERROR: Failed building wheel for lxml
```

**Rozwiązanie:**

**macOS:**

```bash
# Zainstaluj zależności systemowe
brew install libxml2 libxslt

# Potem zainstaluj lxml
pip install lxml
```

**Ubuntu:**

```bash
sudo apt-get install libxml2-dev libxslt1-dev python3-dev
pip install lxml
```

**Windows:**

```powershell
# Użyj pre-built wheel (łatwiejsze)
pip install lxml==4.9.3
```

---

**Problem 2: `psycopg2` nie instaluje się**

```
Error: pg_config executable not found
```

**Rozwiązanie:**

W `requirements.txt` mamy `psycopg2-binary` (nie `psycopg2`), który powinien działać out-of-the-box.

Jeśli nadal problemy:

```bash
# macOS
brew install postgresql

# Ubuntu
sudo apt install libpq-dev

# Potem:
pip install psycopg2-binary
```

---

**Problem 3: pip instaluje ale import nie działa**

```python
>>> import requests
ModuleNotFoundError: No module named 'requests'
```

**Przyczyna:** Używasz Pythona POZA venv (globalny Python)

**Rozwiązanie:**

```bash
# 1. Sprawdź który Python używasz
which python  # macOS/Linux
where python  # Windows

# Jeśli NIE pokazuje venv/bin/python:

# 2. Aktywuj venv ponownie
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows

# 3. Sprawdź ponownie
which python
# Powinno pokazać: .../venv/bin/python

# 4. Teraz import zadziała
python -c "import requests; print('OK')"
```

---

**Problem 4: Permission denied podczas instalacji**

```
ERROR: Could not install packages due to an EnvironmentError: [Errno 13] Permission denied
```

**Rozwiązanie:**

NIE używaj `sudo pip install` w virtual environment!

```bash
# 1. Upewnij się że venv jest aktywny
source venv/bin/activate

# 2. Sprawdź
which pip
# Powinno być w venv/

# 3. Zainstaluj BEZ sudo
pip install -r requirements.txt
```

---

**Problem 5: Python 3.11 nie jest domyślny**

```bash
python --version
# Python 3.9.7  ← stara wersja systemowa
```

**Rozwiązanie:**

Użyj konkretnej wersji przy tworzeniu venv:

```bash
# Twórz venv z Python 3.11 explicitly
python3.11 -m venv venv

# Aktywuj
source venv/bin/activate

# Teraz python w venv to 3.11
python --version
# Python 3.11.x ✓
```

---

#### Daily Workflow - Przypomnienie o venv

**PAMIĘTAJ:** Musisz aktywować venv przed każdą pracą z Pythonem!

```bash
# KAŻDEGO DNIA przed pracą z Python scrapers:

# 1. Przejdź do projektu
cd europoslowie-info

# 2. Aktywuj venv
source venv/bin/activate  # macOS/Linux
# lub
venv\Scripts\activate     # Windows

# Twój prompt pokazuje (venv) - venv aktywny ✓

# 3. Pracuj
(venv) $ python scripts/scrapers/meps.py
(venv) $ pytest
(venv) $ python scripts/main.py

# 4. Jak skończysz (opcjonalne)
(venv) $ deactivate
```

---

#### Dodawanie nowych pakietów Python

Jeśli kiedyś potrzebujesz dodać nowy pakiet:

```bash
# 1. Aktywuj venv
source venv/bin/activate

# 2. Zainstaluj pakiet
pip install nowy-pakiet

# 3. Zaktualizuj requirements.txt
pip freeze > requirements.txt

# 4. Commit requirements.txt
git add requirements.txt
git commit -m "add nowy-pakiet dependency"
git push
```

Dzięki temu inni devs będą mogli zainstalować ten sam pakiet przez `pip install -r requirements.txt`.

---

#### Python Setup Checklist

Po wykonaniu wszystkich kroków, sprawdź:

```bash
□ Python 3.11+ zainstalowany
  python --version  # lub python3.11 --version
  # Expected: Python 3.11.x

□ Virtual environment utworzony
  ls venv/  # folder istnieje
  # Expected: bin/ (lub Scripts/), lib/, pyvenv.cfg

□ Virtual environment aktywny
  # widzisz (venv) w prompcie
  which python  # pokazuje venv/bin/python
  # Expected: /path/to/project/venv/bin/python

□ Pakiety zainstalowane
  pip list  # pokazuje ~23 pakiety
  # Expected: anthropic, beautifulsoup4, pandas, requests, ...

□ Import działa
  python -c "import requests, pandas, anthropic; print('All imports OK')"
  # Expected: All imports OK
```

**Jeśli wszystko ✓ - Python setup gotowy!**

---

## Step 3: Database Setup

### Option A: Docker (Recommended)

```bash
# Start PostgreSQL container
docker run -d \
  --name europosel-db \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=europoslowie \
  -p 5432:5432 \
  postgres:15

# Verify it's running
docker ps
# Should see: europosel-db ... Up

# Test connection
docker exec -it europosel-db psql -U postgres -c "SELECT version();"
```

**Useful Docker commands:**

```bash
# Stop database
docker stop europosel-db

# Start database (after stopping)
docker start europosel-db

# View logs
docker logs europosel-db

# Remove container (WARNING: deletes data)
docker rm -f europosel-db
```

---

### Option B: Local PostgreSQL

**macOS:**

```bash
# Start PostgreSQL service
brew services start postgresql@15

# Create database
createdb europoslowie

# Test connection
psql europoslowie -c "SELECT version();"
```

**Ubuntu/Debian:**

```bash
# Start PostgreSQL service
sudo systemctl start postgresql

# Switch to postgres user
sudo -u postgres psql

# In psql:
CREATE DATABASE europoslowie;
CREATE USER dev WITH PASSWORD 'dev';
GRANT ALL PRIVILEGES ON DATABASE europoslowie TO dev;
\q

# Test connection
psql -U dev -d europoslowie -h localhost -c "SELECT version();"
```

**Windows:**

```powershell
# After installing PostgreSQL from official installer:

# Open pgAdmin or use psql from Start Menu
# Create database named "europoslowie"

# Or via command line (in PostgreSQL bin directory):
createdb -U postgres europoslowie

# Test connection
psql -U postgres -d europoslowie -c "SELECT version();"
```

---

### Option C: Docker Compose (Cleanest)

```yaml
# Create docker-compose.yml in project root:

version: '3.8'

services:
  db:
    image: postgres:15
    container_name: europosel-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: europoslowie
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

```bash
# Start database
docker-compose up -d db

# Stop database
docker-compose down

# View logs
docker-compose logs -f db

# Reset database (WARNING: deletes data)
docker-compose down -v
docker-compose up -d db
```

---

## Step 4: Environment Configuration

### Create .env.local file

```bash
# Copy example file
cp .env.example .env.local

# Edit with your favorite editor
nano .env.local
# or
code .env.local  # VSCode
```

### Required Environment Variables

```bash
# .env.local

#############################################
# DATABASE
#############################################

# Local PostgreSQL (Docker or local install)
DATABASE_URL=postgresql://postgres:dev@localhost:5432/europoslowie

# Or Supabase (production)
# DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

#############################################
# ANTHROPIC API (Required for AI features)
#############################################

ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Get your key from: https://console.anthropic.com/
# Cost: ~$6/month for MVP usage

#############################################
# OPTIONAL - Only needed for production
#############################################

# Supabase (if using managed database)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX  # Google Analytics
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Vercel (auto-populated in production)
VERCEL_URL=auto-populated
VERCEL_ENV=development

#############################################
# DEVELOPMENT
#############################################

NODE_ENV=development
LOG_LEVEL=debug

# Mock API calls (for testing without hitting real APIs)
MOCK_SCRAPING=false
MOCK_AI=false
```

### Getting API Keys

**Anthropic API Key:**

1. Go to https://console.anthropic.com/
2. Sign up / Log in
3. Go to "API Keys"
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)
6. Paste into `.env.local`

**Note:** You'll get $5 free credits. For MVP testing, you might not need to add payment method immediately.

---

## Step 5: Database Initialization

### Run Migrations

```bash
# Make sure virtual environment is activated
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Run Alembic migrations
cd scripts
alembic upgrade head

# Or use npm script (from project root)
npm run db:migrate
```

**Expected output:**

```
INFO  [alembic.runtime.migration] Running upgrade -> 001_initial_schema
INFO  [alembic.runtime.migration] Running upgrade 001 -> 002_add_indexes
✓ Migrations completed successfully
```

**If migrations fail:**

```bash
# Check database is running
pg_isready -h localhost -p 5432

# Check DATABASE_URL is correct
echo $DATABASE_URL

# Reset and try again
alembic downgrade base
alembic upgrade head
```

---

### Seed Test Data

```bash
# Seed with minimal data (5 MEPs, 20 votes - fast)
npm run db:seed

# Or seed with full test data (53 MEPs, 150 votes - slower)
npm run db:seed:full

# Or run Python seeder directly
python scripts/seed_database.py --minimal
```

**Expected output:**

```
Seeding database...
✓ Created 5 MEPs
✓ Created 1 voting session
✓ Created 20 votes (5 MEPs × 4 votes each)
✓ Created 10 questions
✓ Created monthly stats
Database seeded successfully!
```

**Verify data was inserted:**

```bash
# Connect to database
psql $DATABASE_URL

# Check data
SELECT COUNT(*) FROM meps;
-- Should return: 5 (or 53 for full seed)

SELECT COUNT(*) FROM votes;
-- Should return: 20 (or ~8000 for full seed)

\q  # Exit
```

---

## Step 6: Run the Application

### Start Next.js Development Server

```bash
# From project root
npm run dev
```

**Expected output:**

```
▲ Next.js 14.1.0
- Local:        http://localhost:3000
- Network:      http://192.168.1.100:3000

✓ Ready in 2.5s
○ Compiling / ...
✓ Compiled / in 1.2s
```

**Open in browser:**

- Visit http://localhost:3000
- You should see the homepage with list of MEPs

---

### Test API Routes

```bash
# In a new terminal, test API endpoints

# Health check
curl http://localhost:3000/api/health
# Expected: {"status":"ok","database":"connected"}

# Get MEPs list
curl http://localhost:3000/api/meps
# Expected: JSON array of MEPs

# Get specific MEP
curl http://localhost:3000/api/meps/jan-kowalski
# Expected: JSON object with MEP details
```

---

### Run Python Scrapers (Development)

```bash
# In a new terminal, activate venv
source venv/bin/activate

# Run scrapers in test mode (no real API calls)
python scripts/scrapers/meps.py --test

# Or run full pipeline with mock data
MOCK_SCRAPING=true python scripts/main.py
```

**Expected output:**

```
Starting MEPs scraper (TEST MODE)...
✓ Loaded 53 test MEPs
✓ Validation passed: 53/53
✓ Test completed successfully
```

---

## Step 7: Verification Checklist

Before you start developing, verify everything works:

### Database Checks

```bash
# Connect to database
psql $DATABASE_URL

# Run these queries:
SELECT COUNT(*) FROM meps;
-- Should return: 5 or 53

SELECT COUNT(*) FROM votes;
-- Should return: 20 or ~8000

SELECT * FROM meps LIMIT 1;
-- Should return: 1 MEP with all fields

\q  # Exit
```

### Frontend Checks

- [ ] Homepage loads: http://localhost:3000
- [ ] MEPs list displays
- [ ] Click on MEP shows profile page
- [ ] No console errors in browser DevTools (F12)
- [ ] Page loads in <2 seconds

### API Checks

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok"}

curl http://localhost:3000/api/meps | jq length
# Expected: 5 or 53
```

### Backend Checks

```bash
source venv/bin/activate
python scripts/scrapers/meps.py --test
# Expected: ✓ Test completed successfully

pytest tests/
# Expected: All tests pass
```

### Linting Checks

```bash
npm run lint
# Expected: No errors

npm run type-check
# Expected: No TypeScript errors

black --check scripts/
# Expected: All done! ✨
```

---

## Step 8: IDE Setup (Optional but Recommended)

### VSCode Extensions

Install these extensions for best development experience:

```json
{
  "recommendations": [
    // JavaScript/TypeScript
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",

    // Python
    "ms-python.python",
    "ms-python.vscode-pylance",
    "ms-python.black-formatter",

    // Database
    "mtxr.sqltools",
    "mtxr.sqltools-driver-pg",

    // Docker
    "ms-azuretools.vscode-docker",

    // Git
    "eamodio.gitlens",

    // Other
    "streetsidesoftware.code-spell-checker"
  ]
}
```

**Install all at once:**

1. Copy `.vscode/extensions.json` (included in repo)
2. Open VSCode
3. Press `Cmd/Ctrl + Shift + P`
4. Type: "Show Recommended Extensions"
5. Click "Install All"

---

### VSCode Settings

```json
// .vscode/settings.json

{
  // Editor
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",

  // Language-specific formatters
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter",
    "editor.formatOnSave": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },

  // Python
  "python.defaultInterpreterPath": "${workspaceFolder}/venv/bin/python",
  "python.formatting.provider": "black",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.flake8Enabled": true,

  // Files
  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true,
    "**/.pytest_cache": true,
    "**/.next": true,
    "**/node_modules": true
  },

  // Tailwind
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

---

## Development Workflow

### Daily Workflow

```bash
# 1. Start database (if using Docker)
docker start europosel-db
# or: docker-compose up -d db

# 2. Start Next.js dev server (Terminal 1)
npm run dev

# 3. Work on Python scrapers (Terminal 2)
source venv/bin/activate
# Make changes to scripts/scrapers/*.py
python scripts/scrapers/meps.py --test  # Test your changes

# 4. Make changes to frontend
# Edit files in app/, components/, lib/
# Browser auto-reloads on save

# 5. Before committing
npm run lint
npm run type-check
black scripts/
pytest

# 6. Commit
git add .
git commit -m "feat: add new feature"
git push
```

---

### Common Development Tasks

**Run tests:**

```bash
# Frontend tests
npm run test
npm run test:watch  # Watch mode

# Backend tests
pytest
pytest --cov=scripts  # With coverage
pytest -v tests/test_scrapers.py  # Specific file
```

**Lint and format:**

```bash
# Lint
npm run lint
npm run lint:fix  # Auto-fix issues

# Format
npm run format  # Prettier (JS/TS)
black scripts/   # Black (Python)
```

**Database operations:**

```bash
# Create new migration
alembic revision -m "add new column"

# Run migrations
npm run db:migrate

# Rollback
npm run db:rollback

# Reset database (WARNING: deletes all data)
npm run db:reset

# Open database GUI
npm run db:studio
```

**Build for production:**

```bash
# Build Next.js
npm run build

# Test production build locally
npm run start
# Visit http://localhost:3000
```

---

## Troubleshooting

### Issue 1: Database Connection Failed

**Error:**

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# If using Docker:
docker ps | grep europosel-db
# If not running:
docker start europosel-db

# Check DATABASE_URL
echo $DATABASE_URL
# Should be: postgresql://postgres:dev@localhost:5432/europoslowie

# Test connection manually
psql $DATABASE_URL -c "SELECT 1"
```

---

### Issue 2: Python Package Installation Fails

**Error:**

```
Failed building wheel for lxml
```

**Solutions:**

```bash
# macOS
brew install libxml2 libxslt
pip install lxml

# Ubuntu
sudo apt-get install libxml2-dev libxslt1-dev python3-dev
pip install lxml

# Windows
pip install --upgrade pip
pip install lxml==4.9.3  # Use specific version with pre-built wheel
```

**Error:**

```
ERROR: Could not find a version that satisfies the requirement...
```

**Solutions:**

```bash
# Upgrade pip
pip install --upgrade pip

# Use specific Python version
python3.11 -m pip install -r requirements.txt

# Check Python version
python --version  # Must be 3.11+
```

---

### Issue 3: Next.js Build Fails

**Error:**

```
Module not found: Can't resolve '@/components/...'
```

**Solutions:**

```bash
# Delete build cache
rm -rf .next node_modules

# Reinstall dependencies
npm install

# Rebuild
npm run build

# Check tsconfig.json has correct paths:
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Error:**

```
Type error: Property 'xyz' does not exist...
```

**Solutions:**

```bash
# Check TypeScript version
npm list typescript
# Should be 5.3.x

# Restart TypeScript server in VSCode
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Run type check
npm run type-check
```

---

### Issue 4: API Key Invalid

**Error:**

```
401 Unauthorized - Invalid API key
```

**Solutions:**

```bash
# Check .env.local file exists
ls -la .env.local

# Check ANTHROPIC_API_KEY is set
cat .env.local | grep ANTHROPIC_API_KEY

# Verify key format (should start with sk-ant-)
# Get new key from: https://console.anthropic.com/

# Restart dev server after changing .env.local
# Kill server (Ctrl+C) and run: npm run dev
```

---

### Issue 5: Port Already in Use

**Error:**

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

```bash
# Find process using port 3000
lsof -i :3000
# or on Windows:
netstat -ano | findstr :3000

# Kill process
kill -9 [PID]
# or on Windows:
taskkill /PID [PID] /F

# Or use different port
PORT=3001 npm run dev
```

---

### Issue 6: Permission Denied

**Error:**

```
EACCES: permission denied
```

**Solutions:**

```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $USER:$(id -gn $USER) ~/.npm
sudo chown -R $USER:$(id -gn $USER) ~/.config

# Fix Python venv permissions
chmod -R 755 venv/

# On Windows: Run terminal as Administrator
```

---

### Issue 7: Database Migration Fails

**Error:**

```
ERROR: duplicate key value violates unique constraint
```

**Solutions:**

```bash
# Reset database
npm run db:reset

# Or manually:
psql $DATABASE_URL
DROP DATABASE europoslowie;
CREATE DATABASE europoslowie;
\q

# Re-run migrations
npm run db:migrate
npm run db:seed
```

---

## Testing Your Setup

### Automated Setup Test

```bash
# Run setup verification script
npm run verify-setup
```

This script checks:

- Node.js version
- Python version
- Database connectivity
- Environment variables
- Dependencies installed
- Database tables exist
- API endpoints respond

**Expected output:**

```
Running setup verification...

✓ Node.js version: 20.11.0
✓ Python version: 3.11.5
✓ PostgreSQL connection: OK
✓ Environment variables: OK
✓ npm packages: OK (342 packages)
✓ Python packages: OK (23 packages)
✓ Database tables: OK (7 tables)
✓ Next.js dev server: OK
✓ API endpoints: OK

All checks passed! ✨
Your development environment is ready.
```

---

### Manual Testing

**1. Test Frontend:**

```bash
# Start dev server
npm run dev

# Open in browser
open http://localhost:3000

# Check:
- Homepage loads
- MEPs list displays
- Click on MEP → profile page works
- No errors in console (F12)
```

**2. Test Database:**

```bash
# Connect
psql $DATABASE_URL

# Query
SELECT COUNT(*) FROM meps;
SELECT * FROM votes LIMIT 5;

# Exit
\q
```

**3. Test Scrapers:**

```bash
# Activate venv
source venv/bin/activate

# Test scraper
python scripts/scrapers/meps.py --test

# Expected: ✓ Test completed successfully
```

**4. Test AI Integration:**

```bash
# Test AI processor (requires API key)
python scripts/test_ai.py

# Expected output:
# ✓ Context generated
# ✓ Relevance scored
# ✓ Arguments extracted
```

---

## Useful Commands Reference

### npm Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Run production build
npm run lint             # Check code quality
npm run lint:fix         # Fix linting issues
npm run format           # Format code with Prettier
npm run type-check       # Check TypeScript types

# Database
npm run db:migrate       # Run migrations
npm run db:rollback      # Rollback last migration
npm run db:reset         # Reset database
npm run db:seed          # Seed test data
npm run db:seed:full     # Seed full test data
npm run db:studio        # Open database GUI

# Testing
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage

# Utilities
npm run verify-setup     # Verify development environment
npm run clean            # Clean build artifacts
```

---

### Python Scripts

```bash
# Scrapers
python scripts/scrapers/meps.py          # Scrape MEPs
python scripts/scrapers/votes.py         # Scrape votes
python scripts/scrapers/questions.py     # Scrape questions
python scripts/main.py                   # Run full pipeline

# Testing
pytest                                   # Run all tests
pytest tests/test_scrapers.py           # Run specific test file
pytest --cov=scripts                     # Run with coverage
pytest -v                                # Verbose output

# Database
python scripts/seed_database.py          # Seed database
python scripts/seed_database.py --full   # Seed full data

# Utilities
python scripts/test_ai.py                # Test AI integration
black scripts/                           # Format code
flake8 scripts/                          # Lint code
```

---

### Docker Commands

```bash
# PostgreSQL
docker start europosel-db                # Start database
docker stop europosel-db                 # Stop database
docker restart europosel-db              # Restart database
docker logs europosel-db                 # View logs
docker logs -f europosel-db              # Follow logs
docker exec -it europosel-db psql -U postgres  # Connect to database

# Docker Compose
docker-compose up -d                     # Start all services
docker-compose down                      # Stop all services
docker-compose logs -f                   # Follow logs
docker-compose ps                        # List running services
docker-compose restart db                # Restart database
```

---

### Database Commands

```bash
# psql
psql $DATABASE_URL                       # Connect to database
psql $DATABASE_URL -c "SELECT 1"         # Run query
pg_dump $DATABASE_URL > backup.sql       # Backup database
psql $DATABASE_URL < backup.sql          # Restore database

# Inside psql:
\l                                       # List databases
\dt                                      # List tables
\d meps                                  # Describe table
\q                                       # Quit

# Useful queries:
SELECT COUNT(*) FROM meps;               # Count MEPs
SELECT COUNT(*) FROM votes;              # Count votes
SELECT * FROM meps LIMIT 5;              # Show 5 MEPs
```

---

### Git Commands

```bash
# Daily workflow
git status                               # Check status
git add .                                # Stage all changes
git commit -m "feat: add feature"        # Commit
git push                                 # Push to remote

# Branches
git checkout -b feature/new-feature      # Create branch
git checkout main                        # Switch to main
git merge feature/new-feature            # Merge branch
git branch -d feature/new-feature        # Delete branch

# Sync
git pull                                 # Pull latest changes
git fetch                                # Fetch remote changes
git rebase origin/main                   # Rebase on main
```

---

## Next Steps

Now that your development environment is set up:

1. **Read the documentation:**

   - `PROJECT_OVERVIEW.md` - Understand project goals
   - `ARCHITECTURE.md` - Understand system design
   - `DATABASE_SCHEMA.md` - Understand data structure

2. **Explore the codebase:**

   - `app/` - Next.js pages and layouts
   - `components/` - React components
   - `scripts/scrapers/` - Data collection
   - `lib/` - Utility functions

3. **Start developing:**

   - Pick a task from `ROADMAP.md`
   - Create a feature branch
   - Make changes
   - Test thoroughly
   - Commit and push

4. **Get help:**
   - Check `TROUBLESHOOTING.md` for common issues
   - Read inline code comments
   - Ask questions in GitHub Discussions

---

## Related Documents

- `PROJECT_OVERVIEW.md` - Project goals and scope
- `TECH_STACK.md` - Technology choices and rationale
- `ARCHITECTURE.md` - System architecture
- `DATABASE_SCHEMA.md` - Database structure
- `SCRAPING_STRATEGY.md` - Data collection approach
- `AI_PROMPTS.md` - AI integration details
- `DEPLOYMENT.md` - Deploying to production

---

## Getting Help

**If you're stuck:**

1. **Check this guide** - Search for your error message
2. **Check troubleshooting section** - Common issues listed above
3. **Run verify script** - `npm run verify-setup`
4. **Check GitHub Issues** - Someone might have same problem
5. **Ask in Discussions** - Community can help
6. **Open an issue** - If it's a bug

**Useful resources:**

- Next.js Docs: https://nextjs.org/docs
- Python Docs: https://docs.python.org/3/
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Anthropic Docs: https://docs.anthropic.com/

---

## Changes Log

- **2024-12-10 v0.2:** Added detailed Python setup section, clarified npm vs pnpm choice, explained npm install vs create-next-app
- **2024-12-10 v0.1:** Initial setup guide

---

_If you find any issues with this setup guide, please open an issue or submit a PR!_
