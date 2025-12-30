import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as dotenv from 'dotenv'
import * as schema from './schema'

// Load environment variables (for scripts and development)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' })
}

// Check environment variable exists
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Create PostgreSQL connection
const connectionString = process.env.DATABASE_URL

// Connection pool configuration
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

// Create Drizzle instance
export const db = drizzle(client, { schema })

// For debugging (optional, remove in production)
if (process.env.NODE_ENV === 'development') {
  console.log('✅ Database connection initialized')
}
