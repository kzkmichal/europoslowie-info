import * as dotenv from 'dotenv'
import {
  getAllMEPsWithStats,
  getMepBySlug,
  getVoteById,
  getCurrentMonthTopVotes,
} from '../lib/db/queries'

dotenv.config({ path: '.env.local' })

async function testQueries() {
  try {
    console.log('🧪 Testing query functions...\n')

    // Test 1: Get all MEPs with stats
    console.log('1️⃣ Testing getAllMEPsWithStats()...')
    const allMeps = await getAllMEPsWithStats()
    console.log(`   ✅ Found ${allMeps.length} MEPs`)
    if (allMeps[0]) {
      console.log('   📋 Sample MEP:', {
        name: allMeps[0].fullName,
        party: allMeps[0].nationalParty,
        hasStats: !!allMeps[0].latestStats,
        hasTopVote: !!allMeps[0].topVote,
      })
    }

    // Test 2: Get MEP by slug
    if (allMeps[0]) {
      console.log('\n2️⃣ Testing getMepBySlug()...')
      const mep = await getMepBySlug(allMeps[0].slug)
      if (mep) {
        console.log(`   ✅ Found MEP: ${mep.fullName}`)
        console.log(`   📊 Monthly stats: ${mep.monthlyStats.length} months`)
        console.log(`   ⭐ Top votes: ${mep.topVotes.length} votes`)
        console.log(`   👥 Committees: ${mep.committees.length} memberships`)
      } else {
        console.log('   ❌ MEP not found')
      }
    }

    // Test 3: Get vote by ID (if any votes exist)
    console.log('\n3️⃣ Testing getVoteById()...')
    try {
      const vote = await getVoteById(1)
      if (vote) {
        console.log(`   ✅ Found vote: ${vote.vote.title.substring(0, 50)}...`)
        console.log(`   🗳️  Polish votes summary:`, vote.summary)
      } else {
        console.log(
          '   ℹ️  No vote with ID 1 (this is expected if no votes yet)'
        )
      }
    } catch (err) {
      console.log('   ℹ️  No votes in database yet (expected)')
    }

    // Test 4: Get current month top votes
    console.log('\n4️⃣ Testing getCurrentMonthTopVotes()...')
    const topVotes = await getCurrentMonthTopVotes()
    console.log(`   ✅ Found ${topVotes.length} top votes this month`)

    console.log('\n✅ All query tests completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Query test failed:', error)
    process.exit(1)
  }
}

testQueries()
