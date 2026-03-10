import { db } from './index'
import {
  committeeMemberships,
  meps,
  monthlyStats,
  votes,
  votingSessions,
} from './schema'
import { eq, desc, and, sql, count, max, min, asc } from 'drizzle-orm'
import type {
  MEPWithStats,
  MEPProfile,
  VoteDetails,
  MEPVoteHistory,
  VotesList,
  VoteDetailsById,
  RelatedVote,
  EpGroupRow,
  MEPSessionSummary,
  MEPVote,
} from '../types'
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
    }),
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
        eq(committeeMemberships.isCurrent, true),
      ),
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

export async function getVoteDetails(
  voteNumber: string,
): Promise<VoteDetailsById | null> {
  const voteRow = await db
    .select({
      voteNumber: votes.voteNumber,
      title: votes.title,
      titleEn: votes.titleEn,
      date: votes.date,
      result: votes.result,
      votesFor: votes.votesFor,
      votesAgainst: votes.votesAgainst,
      votesAbstain: votes.votesAbstain,
      starsPoland: votes.starsPoland,
      documentReference: votes.documentReference,
      documentUrl: votes.documentUrl,
      contextAi: votes.contextAi,
      topicCategory: votes.topicCategory,
      policyArea: votes.policyArea,
      decLabel: votes.decLabel,
      isMain: votes.isMain,
      sessionId: votes.sessionId,
      session: {
        id: votingSessions.id,
        sessionNumber: votingSessions.sessionNumber,
        startDate: votingSessions.startDate,
        location: votingSessions.location,
      },
    })
    .from(votes)
    .innerJoin(votingSessions, eq(votes.sessionId, votingSessions.id))
    .where(eq(votes.voteNumber, voteNumber))
    .limit(1)

  if (!voteRow[0]) return null

  const { session, ...voteData } = voteRow[0]

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
    .where(and(eq(votes.voteNumber, voteNumber), eq(meps.isActive, true)))
    .orderBy(votes.voteChoice, meps.nationalParty, meps.lastName)

  const groupedVotes = {
    FOR: polishVotes.filter((v) => v.voteChoice === 'FOR'),
    AGAINST: polishVotes.filter((v) => v.voteChoice === 'AGAINST'),
    ABSTAIN: polishVotes.filter((v) => v.voteChoice === 'ABSTAIN'),
    ABSENT: polishVotes.filter((v) => v.voteChoice === 'ABSENT'),
  }

  return {
    ...voteData,
    voteNumber: voteData.voteNumber!,
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
  month: number,
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
        sql`${votes.date} <= ${endDate}::date`,
      ),
    )
    .orderBy(desc(votes.date))

  return topVotes
}

export async function getMepVotes(
  mepSlug: string,
  options: {
    page?: number
    limit?: number
    voteChoice?: 'FOR' | 'AGAINST' | 'ABSTAIN' | 'ABSENT'
  } = {},
): Promise<MEPVoteHistory | null> {
  const { page = 1, limit = 20, voteChoice } = options
  const offset = (page - 1) * limit

  const mep = await db
    .select({ id: meps.id })
    .from(meps)
    .where(eq(meps.slug, mepSlug))
    .limit(1)

  if (!mep[0]) return null

  const mepId = mep[0].id

  const conditions = [eq(votes.mepId, mepId)]
  if (voteChoice) {
    conditions.push(eq(votes.voteChoice, voteChoice))
  }

  const [totalResult, votesList] = await Promise.all([
    db
      .select({ count: count() })
      .from(votes)
      .where(and(...conditions)),

    db
      .select({
        id: votes.id,
        voteNumber: votes.voteNumber,
        title: votes.title,
        titleEn: votes.titleEn,
        date: votes.date,
        voteChoice: votes.voteChoice,
        result: votes.result,
        votesFor: votes.votesFor,
        votesAgainst: votes.votesAgainst,
        votesAbstain: votes.votesAbstain,
        starsPoland: votes.starsPoland,
        sessionId: votes.sessionId,
      })
      .from(votes)
      .where(and(...conditions))
      .orderBy(desc(votes.date))
      .limit(limit)
      .offset(offset),
  ])

  const total = totalResult[0]?.count ?? 0

  return {
    votes: votesList,
    total,
    page,
    limit,
    hasMore: offset + votesList.length < total,
  }
}

export async function getVotesList(
  options: {
    page?: number
    limit?: number
    year?: number
    month?: number
    result?: 'ADOPTED' | 'REJECTED'
  } = {},
): Promise<VotesList> {
  const { page = 1, limit = 20, year, month, result } = options
  const offset = (page - 1) * limit

  const conditions = [eq(votes.isMain, true)]
  if (year && month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]
    conditions.push(sql`${votes.date} >= ${startDate}::date`)
    conditions.push(sql`${votes.date} <= ${endDate}::date`)
  } else if (year) {
    conditions.push(sql`EXTRACT(YEAR FROM ${votes.date}) = ${year}`)
  }

  if (result) {
    conditions.push(eq(votes.result, result))
  }

  const whereClause = and(...conditions)

  const [totalResult, votesList] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(DISTINCT ${votes.voteNumber})` })
      .from(votes)
      .where(whereClause),

    db
      .select({
        id: min(votes.id),
        voteNumber: votes.voteNumber,
        title: max(votes.title),
        titleEn: max(votes.titleEn),
        date: max(votes.date),
        result: max(votes.result),
        votesFor: max(votes.votesFor),
        votesAgainst: max(votes.votesAgainst),
        votesAbstain: max(votes.votesAbstain),
        starsPoland: max(votes.starsPoland),
        polishVotesFor: max(votes.polishVotesFor),
        polishVotesAgainst: max(votes.polishVotesAgainst),
        polishVotesAbstain: max(votes.polishVotesAbstain),
        polishVotesAbsent: max(votes.polishVotesAbsent),
        sessionId: votes.sessionId,
      })
      .from(votes)
      .where(whereClause)
      .groupBy(votes.voteNumber, votes.sessionId)
      .orderBy(desc(max(votes.date)), votes.voteNumber)
      .limit(limit)
      .offset(offset),
  ])

  const total = Number(totalResult[0]?.count ?? 0)

  return {
    votes: votesList.map((v) => ({
      ...v,
      id: v.id ?? 0,
      title: v.title ?? '',
      date: v.date ?? new Date(),
    })),
    total,
    page,
    limit,
    hasMore: offset + votesList.length < total,
  }
}

export async function getCurrentMonthTopVotes(): Promise<Vote[]> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  return getTopVotesForMonth(year, month)
}

export async function getEpGroupBreakdown(
  voteNumber: string,
): Promise<EpGroupRow[]> {
  const rows = await db
    .select({
      epGroup: meps.epGroup,
      voteChoice: votes.voteChoice,
      cnt: count(),
    })
    .from(votes)
    .innerJoin(meps, eq(votes.mepId, meps.id))
    .where(and(eq(votes.voteNumber, voteNumber), eq(meps.isActive, true)))
    .groupBy(meps.epGroup, votes.voteChoice)

  const grouped: Record<string, EpGroupRow> = {}
  for (const row of rows) {
    const group = row.epGroup?.trim() || 'Niezrzeszeni'
    if (!grouped[group]) {
      grouped[group] = {
        epGroup: group,
        for: 0,
        against: 0,
        abstain: 0,
        absent: 0,
        total: 0,
      }
    }
    const r = grouped[group]
    const n = Number(row.cnt)
    if (row.voteChoice === 'FOR') r.for += n
    else if (row.voteChoice === 'AGAINST') r.against += n
    else if (row.voteChoice === 'ABSTAIN') r.abstain += n
    else if (row.voteChoice === 'ABSENT') r.absent += n
    r.total = r.for + r.against + r.abstain + r.absent
  }

  return Object.values(grouped).sort((a, b) => b.total - a.total)
}

export async function getRelatedVotes(
  voteNumber: string,
): Promise<RelatedVote[]> {
  const voteRow = await db
    .select({ title: votes.title, sessionId: votes.sessionId })
    .from(votes)
    .where(eq(votes.voteNumber, voteNumber))
    .limit(1)

  if (!voteRow[0]) return []

  const { title, sessionId } = voteRow[0]

  const related = await db
    .select({
      voteNumber: votes.voteNumber,
      decLabel: max(votes.decLabel),
      result: max(votes.result),
      votesFor: max(votes.votesFor),
      votesAgainst: max(votes.votesAgainst),
      votesAbstain: max(votes.votesAbstain),
      isMain: sql<boolean>`bool_or(${votes.isMain})`,
    })
    .from(votes)
    .where(and(eq(votes.title, title), eq(votes.sessionId, sessionId)))
    .groupBy(votes.voteNumber)
    .orderBy(votes.voteNumber)

  if (related.length <= 1) return []

  return related
    .filter(
      (r): r is typeof r & { voteNumber: string } => r.voteNumber !== null,
    )
    .map((r) => ({
      voteNumber: r.voteNumber,
      decLabel: r.decLabel ?? null,
      result: r.result ?? null,
      votesFor: r.votesFor ?? null,
      votesAgainst: r.votesAgainst ?? null,
      votesAbstain: r.votesAbstain ?? null,
      isMain: r.isMain,
    }))
}

export async function getMepSessionList(
  slug: string,
): Promise<MEPSessionSummary[]> {
  const mep = await db
    .select({ id: meps.id })
    .from(meps)
    .where(eq(meps.slug, slug))
    .limit(1)

  if (!mep[0]) return []

  const mepId = mep[0].id

  const sessions = await db
    .select({
      sessionId: votingSessions.id,
      sessionNumber: votingSessions.sessionNumber,
      startDate: votingSessions.startDate,
      year: sql<number>`EXTRACT(YEAR FROM ${votingSessions.startDate})`,
      endDate: votingSessions.endDate,
      location: votingSessions.location,
      votesFor: sql<number>`SUM(CASE WHEN ${votes.voteChoice} = 'FOR' THEN 1 ELSE 0 END)`,
      votesAgainst: sql<number>`SUM(CASE WHEN ${votes.voteChoice} = 'AGAINST' THEN 1 ELSE 0 END)`,
      votesAbstain: sql<number>`SUM(CASE WHEN ${votes.voteChoice} = 'ABSTAIN' THEN 1 ELSE 0 END)`,
      votesAbsent: sql<number>`SUM(CASE WHEN ${votes.voteChoice} = 'ABSENT' THEN 1 ELSE 0 END)`,
    })
    .from(votes)
    .innerJoin(votingSessions, eq(votes.sessionId, votingSessions.id))
    .where(and(eq(votes.mepId, mepId), eq(votes.isMain, true)))
    .groupBy(
      votingSessions.id,
      votingSessions.sessionNumber,
      votingSessions.startDate,
      votingSessions.endDate,
      votingSessions.location,
      sql<number>`EXTRACT(YEAR FROM ${votingSessions.startDate})`,
    )
    .orderBy(desc(votingSessions.startDate))

  return sessions.map((s) => ({
    ...s,
    id: s.sessionId ?? 0,
  }))
}

export async function getMepVotesBySession(
  slug: string,
  sessionId: number,
): Promise<MEPVote[]> {
  const mep = await db
    .select({ id: meps.id })
    .from(meps)
    .where(eq(meps.slug, slug))
    .limit(1)

  if (!mep[0]) return []

  const mepId = mep[0].id

  const votesList = await db
    .select({
      id: votes.id,
      voteNumber: votes.voteNumber,
      title: votes.title,
      titleEn: votes.titleEn,
      date: votes.date,
      voteChoice: votes.voteChoice,
      result: votes.result,
      votesFor: votes.votesFor,
      votesAgainst: votes.votesAgainst,
      votesAbstain: votes.votesAbstain,
      starsPoland: votes.starsPoland,
      sessionId: votes.sessionId,
    })
    .from(votes)
    .where(
      and(
        eq(votes.mepId, mepId),
        eq(votes.isMain, true),
        eq(votes.sessionId, sessionId),
      ),
    )
    .orderBy(asc(votes.voteNumber))

  return votesList.map((v) => ({
    ...v,
    id: v.id ?? 0,
    title: v.title ?? '',
    titleEn: v.titleEn ?? '',
    date: v.date ?? new Date(),
  }))
}
