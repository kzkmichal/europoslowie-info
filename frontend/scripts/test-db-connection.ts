import * as dotenv from 'dotenv'
import { db } from '../lib/db'
import { sql } from 'drizzle-orm'

// Load .env.local file
dotenv.config({ path: '.env.local' })

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...')
    console.log('📍 DATABASE_URL:', process.env.DATABASE_URL)

    const result = await db.execute(sql`SELECT 1 as test`)
    console.log('✅ Database connection successful:', result)

    // Test actual table access
    const tableCheck = await db.execute(sql`SELECT COUNT(*) as count FROM meps`)
    console.log('✅ MEPs table accessible:', tableCheck)

    process.exit(0)
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }
}

testConnection()
