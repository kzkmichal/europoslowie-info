# Quick Start Guide - Europosłowie.info

## Prerequisites

✅ Already installed on your system:
- Node.js v23.6.0
- npm 10.9.2
- Docker (database is running)
- Python 3.9

## Current Status

**Database:** ✅ Running on port 5433
```bash
docker ps
# Should show: europosel-db container running
```

**Frontend Dependencies:** ✅ Installed
```bash
ls frontend/node_modules | wc -l
# Should show ~300+ packages
```

## Running the Project Locally

### 1. Start Database (if not running)

```bash
docker-compose up -d
```

Check status:
```bash
docker ps
# Should show: europosel-db on 0.0.0.0:5433->5432/tcp
```

### 2. Configure Environment Variables

**Frontend (.env.local):**
```bash
cd frontend
cat .env.local
# Should contain: DATABASE_URL=postgresql://...
```

If missing, create it:
```bash
echo 'DATABASE_URL=postgresql://postgres:dev@localhost:5433/europoslowie' > .env.local
```

**Backend (.env):**
```bash
cd ..
cat .env
# Should contain: DATABASE_URL=postgresql://...
```

If missing, create it:
```bash
echo 'DATABASE_URL=postgresql://postgres:dev@localhost:5433/europoslowie?client_encoding=utf8' > .env
```

### 3. Run Database Migrations (if needed)

```bash
cd frontend
npm run db:test
# Should show: Database connection successful ✓
```

### 4. Start Development Server

**Option 1: From root directory (recommended):**
```bash
npm run dev
```

**Option 2: From frontend directory:**
```bash
cd frontend
npm run dev
```

Server should start on: **http://localhost:3000**

**Note:** If you get "Cannot find module 'tailwindcss'" error, make sure you're running from the correct directory or use the root package.json convenience scripts.

## Common Issues & Solutions

### Issue 1: Port 3000 already in use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Find process using port 3000
lsof -ti:3000
# Kill it
kill -9 $(lsof -ti:3000)
# Or use different port
PORT=3001 npm run dev
```

### Issue 2: Database connection failed

**Error:** `ECONNREFUSED` or `password authentication failed`

**Check database:**
```bash
docker ps
# If not running:
docker-compose up -d
```

**Test connection:**
```bash
cd frontend
npm run db:test
```

**Verify credentials:**
- Host: localhost
- Port: 5433 (not 5432!)
- User: postgres
- Password: dev
- Database: europoslowie

### Issue 3: Module not found

**Error:** `Cannot find module 'next'` or similar

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Issue 4: TypeScript errors

**Error:** Type errors during build

**Solution:**
```bash
cd frontend
npm run lint
# Fix any reported issues
```

### Issue 5: Python scraper issues

**Error:** When running scrapers

**Solution:**
```bash
# Check Python version
python3 --version
# Should be 3.9+

# Install dependencies
pip3 install -r requirements.txt

# Test scraper
python3 -c "import sys; sys.path.insert(0, '.'); from scripts.scrapers.meps import MEPsScraper; print('OK')"
```

## Verification Steps

### 1. Check Database

```bash
cd frontend
npm run db:test:queries
```

Expected output:
```
✅ Database connection initialized
✅ Found 58 MEPs
✅ All query tests completed successfully!
```

### 2. Check Frontend

```bash
npm run dev
```

Visit: http://localhost:3000

You should see:
- Homepage with MEP cards
- Database stats
- No console errors

### 3. Check API Routes

Once dev server is running, test:
- http://localhost:3000/api/health
- Should return JSON with status

## Project Structure

```
europrojekt/
├── frontend/           # Next.js 16 app
│   ├── app/           # App Router pages
│   ├── components/    # React components
│   ├── lib/           # Database & utilities
│   ├── .env.local     # Environment variables
│   └── package.json
├── scripts/           # Python scrapers
│   ├── scrapers/      # MEPs, sessions, votes
│   └── utils/         # DB writer, HTTP client
├── alembic/           # Database migrations
├── docker-compose.yml # PostgreSQL setup
└── .env               # Backend environment

```

## Available Commands

### Frontend

```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build
npm start

# Database tests
npm run db:test
npm run db:test:queries

# Drizzle Studio (database UI)
npm run db:studio
```

### Backend/Scrapers

```bash
# Run all scrapers
python3 scripts/run_scrapers.py

# Run specific scraper
python3 scripts/run_scrapers.py --skip-sessions --skip-votes

# Test scrapers
python3 scripts/test_all_scrapers.py
```

### Database

```bash
# Start database
docker-compose up -d

# Stop database
docker-compose down

# View logs
docker-compose logs -f

# Access PostgreSQL CLI
docker exec -it europosel-db psql -U postgres -d europoslowie
```

## Quick Test Script

Run this to verify everything works:

```bash
#!/bin/bash

echo "🧪 Testing Europosłowie.info setup..."

# Check database
echo "1. Checking database..."
docker ps | grep europosel-db && echo "✅ Database running" || echo "❌ Database not running"

# Check frontend dependencies
echo "2. Checking frontend..."
cd frontend
[ -d "node_modules" ] && echo "✅ Dependencies installed" || echo "❌ Run: npm install"

# Test database connection
echo "3. Testing database connection..."
npm run db:test 2>&1 | grep -q "successful" && echo "✅ Database connected" || echo "❌ Check .env.local"

echo "
✅ Setup complete! Run: npm run dev
"
```

## Need Help?

1. **Check logs:** Look for error messages in terminal
2. **Database issues:** Run `npm run db:test`
3. **Frontend issues:** Check browser console (F12)
4. **Port conflicts:** Use different port: `PORT=3001 npm run dev`

## Current Data Status

- ✅ **54 Polish MEPs** in database (real EP data)
- ✅ **Sessions scraper** working (2014-2025+)
- ⏳ **Votes scraper** in development
- ✅ **Frontend** fully functional

---

**Last Updated:** 2026-01-17
**Node Version:** v23.6.0
**Database Port:** 5433
**Frontend Port:** 3000
