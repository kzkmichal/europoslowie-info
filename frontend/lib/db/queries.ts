import { db } from './index'
import {
  committeeMemberships,
  meps,
  monthlyStats,
  votes,
  votingSessions,
} from './schema'
import { eq, desc, and, sql } from 'drizzle-orm'
import type { MEPWithStats, MEPProfile, VoteDetails } from '../types'
import type { Vote } from './schema'

export async function getAllMEPsWithStats(): Promise<MEPWithStats[]> {
  const allMeps = await db.select().from(meps).where(eq(meps.isActive, true))

  const mepsWithStats = await Promise.all(
    allMeps.map(async (mep) => {
      const latestStats = await db
        .select()
        .from(monthlyStats)
        .where(eq(monthlyStats.mepId, mep.id))
        .orderBy(desc(monthlyStats.year), desc(monthlyStats.month))
        .limit(1)

      const topVote = await db
        .select({
          id: votes.id,
          title: votes.title,
          starsPoland: votes.starsPoland,
        })
        .from(votes)
        .where(eq(votes.mepId, mep.id))
        .orderBy(desc(votes.starsPoland), desc(votes.date))
        .limit(1)

      return {
        ...mep,
        latestStats: latestStats[0] || null,
        topVote: topVote[0] || null,
      }
    })
  )

  return mepsWithStats
}

export async function getMepBySlug(slug: string): Promise<MEPProfile | null> {
  const mep = await db.select().from(meps).where(eq(meps.slug, slug)).limit(1)

  if (!mep[0]) return null

  const stats = await db
    .select()
    .from(monthlyStats)
    .where(eq(monthlyStats.mepId, mep[0].id))
    .orderBy(desc(monthlyStats.year), desc(monthlyStats.month))
    .limit(12)

  const topVotes = await db
    .select()
    .from(votes)
    .where(and(eq(votes.mepId, mep[0].id), sql`${votes.starsPoland} >= 4`))
    .orderBy(desc(votes.starsPoland), desc(votes.date))
    .limit(10)

  const committees = await db
    .select()
    .from(committeeMemberships)
    .where(
      and(
        eq(committeeMemberships.mepId, mep[0].id),
        eq(committeeMemberships.isCurrent, true)
      )
    )

  return {
    ...mep[0],
    monthlyStats: stats,
    topVotes,
    committees,
  }
}

export async function getVoteById(id: number): Promise<VoteDetails | null> {
  const voteData = await db
    .select({
      vote: votes,
      session: votingSessions,
    })
    .from(votes)
    .innerJoin(votingSessions, eq(votes.sessionId, votingSessions.id))
    .where(eq(votes.id, id))

  if (!voteData[0]) return null

  const { vote, session } = voteData[0]

  const whereConditions = [
    eq(votes.sessionId, vote.sessionId),
    eq(meps.isActive, true),
  ]

  if (vote.voteNumber) {
    whereConditions.push(eq(votes.voteNumber, vote.voteNumber))
  }

  const polishVotes = await db
    .select({
      mep: {
        id: meps.id,
        slug: meps.slug,
        fullName: meps.fullName,
        nationalParty: meps.nationalParty,
        epGroup: meps.epGroup,
      },
      voteChoice: votes.voteChoice,
    })
    .from(votes)
    .innerJoin(meps, eq(votes.mepId, meps.id))
    .where(and(...whereConditions))
    .orderBy(votes.voteChoice, meps.nationalParty, meps.lastName)

  const groupedVotes = {
    FOR: polishVotes.filter((vote) => vote.voteChoice === 'FOR'),
    AGAINST: polishVotes.filter((vote) => vote.voteChoice === 'AGAINST'),
    ABSTAIN: polishVotes.filter((vote) => vote.voteChoice === 'ABSTAIN'),
    ABSENT: polishVotes.filter((vote) => vote.voteChoice === 'ABSENT'),
  }

  return {
    vote,
    session,
    polishVotes: groupedVotes,
    summary: {
      for: groupedVotes.FOR.length,
      against: groupedVotes.AGAINST.length,
      abstain: groupedVotes.ABSTAIN.length,
      absent: groupedVotes.ABSENT.length,
    },
  }
}

export async function getTopVotesForMonth(
  year: number,
  month: number
): Promise<Vote[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const topVotes = await db
    .select()
    .from(votes)
    .where(
      and(
        eq(votes.starsPoland, 5),
        sql`${votes.date} >= ${startDate}::date`,
        sql`${votes.date} <= ${endDate}::date`
      )
    )
    .orderBy(desc(votes.date))

  return topVotes
}

export async function getCurrentMonthTopVotes(): Promise<Vote[]> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  return getTopVotesForMonth(year, month)
}
