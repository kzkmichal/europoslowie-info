import { unstable_cache } from 'next/cache'
import { db } from './index'
import {
  committeeMemberships,
  meps,
  mepDocuments,
  monthlyStats,
  votes,
  votingSessions,
  voteSources,
  questions,
  speeches,
} from './schema'
import { eq, desc, and, sql, count, max, min, asc, gte, lte } from 'drizzle-orm'
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
  MEPMonthSummary,
  MEPActivityMonthSummary,
  MEPVote,
  VoteSource,
} from '../types'
import type { Vote, Question, Speech, MepDocument } from './schema'

type LatestStatsRow = {
  id: number
  mep_id: number
  year: number
  month: number
  total_votes: number
  votes_for: number
  votes_against: number
  votes_abstain: number
  votes_absent: number
  attendance_rate: number | string | null
  questions_count: number | null
  speeches_count: number | null
  reports_count: number | null
  ranking_among_poles: number | null
  ranking_in_group: number | null
  votes_poland_5star: number | null
  votes_poland_4star: number | null
}

type TopVoteRow = {
  id: number
  mep_id: number
  title: string
  stars_poland: number | null
}

export async function getAllMEPsWithStats(): Promise<MEPWithStats[]> {
  const [allMeps, latestStatsRows, topVoteRows, committeeRows] =
    await Promise.all([
      db.select().from(meps).where(eq(meps.isActive, true)),

      db.execute(sql`
      SELECT DISTINCT ON (mep_id) *
      FROM monthly_stats
      ORDER BY mep_id, year DESC, month DESC
    `) as Promise<LatestStatsRow[]>,

      db.execute(sql`
      SELECT DISTINCT ON (mep_id) id, mep_id, title, stars_poland
      FROM votes
      ORDER BY mep_id, stars_poland DESC NULLS LAST, date DESC
    `) as Promise<TopVoteRow[]>,

      db
        .select()
        .from(committeeMemberships)
        .where(eq(committeeMemberships.isCurrent, true)),
    ])

  const statsByMepId = new Map(latestStatsRows.map((r) => [r.mep_id, r]))
  const topVoteByMepId = new Map(topVoteRows.map((r) => [r.mep_id, r]))
  const committeesByMepId = new Map<number, (typeof committeeRows)[number][]>()
  for (const row of committeeRows) {
    const list = committeesByMepId.get(row.mepId) ?? []
    list.push(row)
    committeesByMepId.set(row.mepId, list)
  }

  return allMeps.map((mep) => {
    const s = statsByMepId.get(mep.id)
    const v = topVoteByMepId.get(mep.id)
    return {
      ...mep,
      latestStats: s
        ? {
            id: s.id,
            mepId: s.mep_id,
            year: s.year,
            month: s.month,
            totalVotes: s.total_votes,
            votesFor: s.votes_for,
            votesAgainst: s.votes_against,
            votesAbstain: s.votes_abstain,
            votesAbsent: s.votes_absent,
            attendanceRate: s.attendance_rate != null ? Number(s.attendance_rate) : 0,
            questionsCount: s.questions_count,
            speechesCount: s.speeches_count,
            reportsCount: s.reports_count,
            rankingAmongPoles: s.ranking_among_poles,
            rankingInGroup: s.ranking_in_group,
            votes5Star: s.votes_poland_5star,
            votes4Star: s.votes_poland_4star,
          }
        : null,
      topVote: v
        ? { id: v.id, title: v.title, starsPoland: v.stars_poland }
        : null,
      committees: committeesByMepId.get(mep.id) ?? [],
    }
  })
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
        photoUrl: meps.photoUrl,
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
      voteDescription: votes.voteDescription,
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
        photoUrl: meps.photoUrl,
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

  const conditions = [eq(votes.mepId, mepId), eq(votes.isMain, true)]
  if (voteChoice) {
    conditions.push(eq(votes.voteChoice, voteChoice))
  }

  // Priority filters — same logic as getVotesList and getMepVotesBySession:
  // prefer "całość tekstu" > "Wstępne porozumienie" > "Wniosek o odrzucenie" > latest vote
  const isFinal = sql`(${votes.decLabel} ILIKE '%całość tekstu%' OR ${votes.decLabel} ILIKE '%cały tekst%')`
  const isProvisional = sql`${votes.decLabel} ILIKE '%Wstępne porozumienie%'`
  const isRejection = sql`${votes.decLabel} ILIKE '%Wniosek o odrzucenie%'`

  const [totalResult, votesList] = await Promise.all([
    db
      .select({
        count: sql<number>`COUNT(DISTINCT (${votes.title}, ${votes.sessionId}))::int`,
      })
      .from(votes)
      .where(and(...conditions)),

    db
      .select({
        id: min(votes.id),
        voteNumber: sql<string | null>`COALESCE(
          MAX(${votes.voteNumber}) FILTER (WHERE ${isFinal}),
          MAX(${votes.voteNumber}) FILTER (WHERE ${isProvisional}),
          MAX(${votes.voteNumber}) FILTER (WHERE ${isRejection}),
          MAX(${votes.voteNumber})
        )`,
        title: votes.title,
        titleEn: max(votes.titleEn),
        date: max(votes.date),
        voteChoice: sql<string>`COALESCE(
          MAX(${votes.voteChoice}) FILTER (WHERE ${isFinal}),
          MAX(${votes.voteChoice}) FILTER (WHERE ${isProvisional}),
          MAX(${votes.voteChoice}) FILTER (WHERE ${isRejection}),
          (ARRAY_AGG(${votes.voteChoice} ORDER BY ${votes.voteNumber} DESC))[1]
        )`,
        result: sql<string | null>`COALESCE(
          MAX(${votes.result}) FILTER (WHERE ${isFinal}),
          MAX(${votes.result}) FILTER (WHERE ${isProvisional}),
          MAX(${votes.result}) FILTER (WHERE ${isRejection}),
          MAX(${votes.result})
        )`,
        votesFor: sql<number | null>`COALESCE(
          MAX(${votes.votesFor}) FILTER (WHERE ${isFinal}),
          MAX(${votes.votesFor}) FILTER (WHERE ${isProvisional}),
          MAX(${votes.votesFor}) FILTER (WHERE ${isRejection}),
          MAX(${votes.votesFor})
        )`,
        votesAgainst: sql<number | null>`COALESCE(
          MAX(${votes.votesAgainst}) FILTER (WHERE ${isFinal}),
          MAX(${votes.votesAgainst}) FILTER (WHERE ${isProvisional}),
          MAX(${votes.votesAgainst}) FILTER (WHERE ${isRejection}),
          MAX(${votes.votesAgainst})
        )`,
        votesAbstain: sql<number | null>`COALESCE(
          MAX(${votes.votesAbstain}) FILTER (WHERE ${isFinal}),
          MAX(${votes.votesAbstain}) FILTER (WHERE ${isProvisional}),
          MAX(${votes.votesAbstain}) FILTER (WHERE ${isRejection}),
          MAX(${votes.votesAbstain})
        )`,
        starsPoland: sql<number | null>`COALESCE(
          MAX(${votes.starsPoland}) FILTER (WHERE ${isFinal}),
          MAX(${votes.starsPoland}) FILTER (WHERE ${isProvisional}),
          MAX(${votes.starsPoland}) FILTER (WHERE ${isRejection}),
          MAX(${votes.starsPoland})
        )`,
        sessionId: votes.sessionId,
        relatedCount: sql<number>`GREATEST(COUNT(*) - 1, 0)::int`,
      })
      .from(votes)
      .where(and(...conditions))
      .groupBy(votes.title, votes.sessionId)
      .orderBy(desc(max(votes.date)), min(votes.id))
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

export async function getTopicCategories(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ topicCategory: votes.topicCategory })
    .from(votes)
    .where(sql`${votes.topicCategory} IS NOT NULL`)
    .orderBy(asc(votes.topicCategory))

  return rows.map((r) => r.topicCategory).filter((t): t is string => t !== null)
}

async function _getVotesList(
  options: {
    page?: number
    limit?: number
    year?: number
    month?: number
    result?: 'ADOPTED' | 'REJECTED'
    search?: string
    topic?: string
  } = {},
): Promise<VotesList> {
  const { page = 1, limit = 20, year, month, result, search, topic } = options
  const offset = (page - 1) * limit

  const conditions = [eq(votes.isMain, true)]
  if (year && month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]
    conditions.push(sql`${votes.date} >= ${startDate}::date`)
    conditions.push(sql`${votes.date} <= ${endDate}::date`)
  } else if (year) {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`
    conditions.push(sql`${votes.date} >= ${startDate}::date`)
    conditions.push(sql`${votes.date} <= ${endDate}::date`)
  }

  if (result) {
    conditions.push(eq(votes.result, result))
  }

  if (search) {
    conditions.push(sql`${votes.title} ILIKE ${'%' + search + '%'}`)
  }

  if (topic) {
    conditions.push(eq(votes.topicCategory, topic))
  }

  const whereClause = and(...conditions)

  // Priority filters for representative vote selection within each (title, session) group:
  // 1. "całość tekstu" / "cały tekst" — final vote on the whole text
  // 2. "Wstępne porozumienie" — provisional agreement
  // 3. "Wniosek o odrzucenie" — proposal to reject
  // 4. fallback: highest vote_number (latest in session)
  const isFinal = sql`(${votes.decLabel} ILIKE '%całość tekstu%' OR ${votes.decLabel} ILIKE '%cały tekst%')`
  const isProvisional = sql`${votes.decLabel} ILIKE '%Wstępne porozumienie%'`
  const isRejection = sql`${votes.decLabel} ILIKE '%Wniosek o odrzucenie%'`

  const [totalResult, votesList] = await Promise.all([
    db
      .select({
        count: sql<number>`COUNT(DISTINCT (${votes.title}, ${votes.sessionId}))::int`,
      })
      .from(votes)
      .where(whereClause),

    db
      .select({
        id: min(votes.id),
        voteNumber: sql<string | null>`COALESCE(
          MAX(${votes.voteNumber}) FILTER (WHERE ${isFinal}),
          MAX(${votes.voteNumber}) FILTER (WHERE ${isProvisional}),
          MAX(${votes.voteNumber}) FILTER (WHERE ${isRejection}),
          MAX(${votes.voteNumber})
        )`,
        title: votes.title,
        titleEn: max(votes.titleEn),
        date: max(votes.date),
        result: sql<string | null>`COALESCE(
          MAX(${votes.result}) FILTER (WHERE ${isFinal}),
          MAX(${votes.result}) FILTER (WHERE ${isProvisional}),
          MAX(${votes.result}) FILTER (WHERE ${isRejection}),
          MAX(${votes.result})
        )`,
        votesFor: sql<number | null>`COALESCE(
          MAX(${votes.votesFor}) FILTER (WHERE ${isFinal}),
          MAX(${votes.votesFor}) FILTER (WHERE ${isProvisional}),
          MAX(${votes.votesFor}) FILTER (WHERE ${isRejection}),
          MAX(${votes.votesFor})
        )`,
        votesAgainst: sql<number | null>`COALESCE(
          MAX(${votes.votesAgainst}) FILTER (WHERE ${isFinal}),
          MAX(${votes.votesAgainst}) FILTER (WHERE ${isProvisional}),
          MAX(${votes.votesAgainst}) FILTER (WHERE ${isRejection}),
          MAX(${votes.votesAgainst})
        )`,
        votesAbstain: sql<number | null>`COALESCE(
          MAX(${votes.votesAbstain}) FILTER (WHERE ${isFinal}),
          MAX(${votes.votesAbstain}) FILTER (WHERE ${isProvisional}),
          MAX(${votes.votesAbstain}) FILTER (WHERE ${isRejection}),
          MAX(${votes.votesAbstain})
        )`,
        starsPoland: sql<number | null>`COALESCE(
          MAX(${votes.starsPoland}) FILTER (WHERE ${isFinal}),
          MAX(${votes.starsPoland}) FILTER (WHERE ${isProvisional}),
          MAX(${votes.starsPoland}) FILTER (WHERE ${isRejection}),
          MAX(${votes.starsPoland})
        )`,
        polishVotesFor: sql<number | null>`COALESCE(
          MAX(${votes.polishVotesFor}) FILTER (WHERE ${isFinal}),
          MAX(${votes.polishVotesFor}) FILTER (WHERE ${isProvisional}),
          MAX(${votes.polishVotesFor}) FILTER (WHERE ${isRejection}),
          MAX(${votes.polishVotesFor})
        )`,
        polishVotesAgainst: sql<number | null>`COALESCE(
          MAX(${votes.polishVotesAgainst}) FILTER (WHERE ${isFinal}),
          MAX(${votes.polishVotesAgainst}) FILTER (WHERE ${isProvisional}),
          MAX(${votes.polishVotesAgainst}) FILTER (WHERE ${isRejection}),
          MAX(${votes.polishVotesAgainst})
        )`,
        polishVotesAbstain: sql<number | null>`COALESCE(
          MAX(${votes.polishVotesAbstain}) FILTER (WHERE ${isFinal}),
          MAX(${votes.polishVotesAbstain}) FILTER (WHERE ${isProvisional}),
          MAX(${votes.polishVotesAbstain}) FILTER (WHERE ${isRejection}),
          MAX(${votes.polishVotesAbstain})
        )`,
        polishVotesAbsent: sql<number | null>`COALESCE(
          MAX(${votes.polishVotesAbsent}) FILTER (WHERE ${isFinal}),
          MAX(${votes.polishVotesAbsent}) FILTER (WHERE ${isProvisional}),
          MAX(${votes.polishVotesAbsent}) FILTER (WHERE ${isRejection}),
          MAX(${votes.polishVotesAbsent})
        )`,
        sessionId: votes.sessionId,
        topicCategory: sql<string | null>`MAX(${votes.topicCategory})`,
        relatedCount: sql<number>`GREATEST(COUNT(*) - 1, 0)`,
      })
      .from(votes)
      .where(whereClause)
      .groupBy(votes.title, votes.sessionId)
      .orderBy(desc(max(votes.date)), min(votes.id))
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

export const getVotesList = unstable_cache(_getVotesList, ['votes-list'], {
  revalidate: 300,
  tags: ['votes-list'],
})

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

  // Priority filters — same logic as getVotesList:
  // prefer "całość tekstu" > "Wstępne porozumienie" > "Wniosek o odrzucenie" > latest vote
  const isFinal = sql`(${votes.decLabel} ILIKE '%całość tekstu%' OR ${votes.decLabel} ILIKE '%cały tekst%')`
  const isProvisional = sql`${votes.decLabel} ILIKE '%Wstępne porozumienie%'`
  const isRejection = sql`${votes.decLabel} ILIKE '%Wniosek o odrzucenie%'`

  const votesList = await db
    .select({
      id: min(votes.id),
      voteNumber: sql<string | null>`COALESCE(
        MAX(${votes.voteNumber}) FILTER (WHERE ${isFinal}),
        MAX(${votes.voteNumber}) FILTER (WHERE ${isProvisional}),
        MAX(${votes.voteNumber}) FILTER (WHERE ${isRejection}),
        MAX(${votes.voteNumber})
      )`,
      title: votes.title,
      titleEn: max(votes.titleEn),
      date: max(votes.date),
      // For voteChoice use ARRAY_AGG ordered by vote_number DESC so the fallback
      // correctly picks the MEP's choice on the latest (most final) vote
      voteChoice: sql<string>`COALESCE(
        MAX(${votes.voteChoice}) FILTER (WHERE ${isFinal}),
        MAX(${votes.voteChoice}) FILTER (WHERE ${isProvisional}),
        MAX(${votes.voteChoice}) FILTER (WHERE ${isRejection}),
        (ARRAY_AGG(${votes.voteChoice} ORDER BY ${votes.voteNumber} DESC))[1]
      )`,
      result: sql<string | null>`COALESCE(
        MAX(${votes.result}) FILTER (WHERE ${isFinal}),
        MAX(${votes.result}) FILTER (WHERE ${isProvisional}),
        MAX(${votes.result}) FILTER (WHERE ${isRejection}),
        MAX(${votes.result})
      )`,
      votesFor: sql<number | null>`COALESCE(
        MAX(${votes.votesFor}) FILTER (WHERE ${isFinal}),
        MAX(${votes.votesFor}) FILTER (WHERE ${isProvisional}),
        MAX(${votes.votesFor}) FILTER (WHERE ${isRejection}),
        MAX(${votes.votesFor})
      )`,
      votesAgainst: sql<number | null>`COALESCE(
        MAX(${votes.votesAgainst}) FILTER (WHERE ${isFinal}),
        MAX(${votes.votesAgainst}) FILTER (WHERE ${isProvisional}),
        MAX(${votes.votesAgainst}) FILTER (WHERE ${isRejection}),
        MAX(${votes.votesAgainst})
      )`,
      votesAbstain: sql<number | null>`COALESCE(
        MAX(${votes.votesAbstain}) FILTER (WHERE ${isFinal}),
        MAX(${votes.votesAbstain}) FILTER (WHERE ${isProvisional}),
        MAX(${votes.votesAbstain}) FILTER (WHERE ${isRejection}),
        MAX(${votes.votesAbstain})
      )`,
      starsPoland: sql<number | null>`COALESCE(
        MAX(${votes.starsPoland}) FILTER (WHERE ${isFinal}),
        MAX(${votes.starsPoland}) FILTER (WHERE ${isProvisional}),
        MAX(${votes.starsPoland}) FILTER (WHERE ${isRejection}),
        MAX(${votes.starsPoland})
      )`,
      sessionId: votes.sessionId,
      // How many sub-votes (Ust., Popr.) were grouped here beyond the representative
      relatedCount: sql<number>`GREATEST(COUNT(*) - 1, 0)::int`,
    })
    .from(votes)
    .where(
      and(
        eq(votes.mepId, mepId),
        eq(votes.isMain, true),
        eq(votes.sessionId, sessionId),
      ),
    )
    .groupBy(votes.title, votes.sessionId)
    .orderBy(sql`MAX(${votes.voteNumber}) ASC`)

  return votesList.map((v) => ({
    ...v,
    id: v.id ?? 0,
    title: v.title ?? '',
    titleEn: v.titleEn ?? '',
    date: v.date ?? new Date(),
  }))
}

export async function getMepQuestions(slug: string): Promise<Question[]> {
  const mep = await db
    .select({ id: meps.id })
    .from(meps)
    .where(eq(meps.slug, slug))
    .limit(1)

  if (!mep[0]) return []

  return db
    .select()
    .from(questions)
    .where(eq(questions.mepId, mep[0].id))
    .orderBy(desc(questions.dateSubmitted))
}

export async function getMepSpeeches(slug: string): Promise<Speech[]> {
  const mep = await db
    .select({ id: meps.id })
    .from(meps)
    .where(eq(meps.slug, slug))
    .limit(1)

  if (!mep[0]) return []

  return db
    .select()
    .from(speeches)
    .where(eq(speeches.mepId, mep[0].id))
    .orderBy(desc(speeches.speechDate))
}

export async function getMepMonthList(
  slug: string,
): Promise<MEPMonthSummary[]> {
  const mep = await db
    .select({ id: meps.id })
    .from(meps)
    .where(eq(meps.slug, slug))
    .limit(1)

  if (!mep[0]) return []

  const rows = await db
    .select({
      year: sql<number>`EXTRACT(YEAR FROM ${votes.date})::int`,
      month: sql<number>`EXTRACT(MONTH FROM ${votes.date})::int`,
      voteCount: sql<number>`COUNT(DISTINCT ${votes.title})::int`,
      location: sql<string | null>`MAX(${votingSessions.location})`,
    })
    .from(votes)
    .innerJoin(votingSessions, eq(votes.sessionId, votingSessions.id))
    .where(and(eq(votes.mepId, mep[0].id), eq(votes.isMain, true)))
    .groupBy(
      sql`EXTRACT(YEAR FROM ${votes.date})`,
      sql`EXTRACT(MONTH FROM ${votes.date})`,
    )
    .orderBy(
      desc(sql`EXTRACT(YEAR FROM ${votes.date})`),
      desc(sql`EXTRACT(MONTH FROM ${votes.date})`),
    )

  return rows
}

export async function getMepActivityMonthList(
  slug: string,
): Promise<MEPActivityMonthSummary[]> {
  const mep = await db
    .select({ id: meps.id })
    .from(meps)
    .where(eq(meps.slug, slug))
    .limit(1)
  if (!mep[0]) return []

  return db
    .select({
      year: monthlyStats.year,
      month: monthlyStats.month,
      speechesCount: sql<number>`COALESCE(${monthlyStats.speechesCount}, 0)::int`,
      questionsCount: sql<number>`COALESCE(${monthlyStats.questionsCount}, 0)::int`,
    })
    .from(monthlyStats)
    .where(eq(monthlyStats.mepId, mep[0].id))
    .orderBy(desc(monthlyStats.year), desc(monthlyStats.month))
}

export async function getMepVotesByMonth(
  slug: string,
  year: number,
  month: number,
): Promise<MEPVote[]> {
  const mep = await db
    .select({ id: meps.id })
    .from(meps)
    .where(eq(meps.slug, slug))
    .limit(1)

  if (!mep[0]) return []

  const mepId = mep[0].id

  const isFinal = sql`(${votes.decLabel} ILIKE '%całość tekstu%' OR ${votes.decLabel} ILIKE '%cały tekst%')`
  const isProvisional = sql`${votes.decLabel} ILIKE '%Wstępne porozumienie%'`
  const isRejection = sql`${votes.decLabel} ILIKE '%Wniosek o odrzucenie%'`

  const votesList = await db
    .select({
      id: min(votes.id),
      voteNumber: sql<string | null>`COALESCE(
        MAX(${votes.voteNumber}) FILTER (WHERE ${isFinal}),
        MAX(${votes.voteNumber}) FILTER (WHERE ${isProvisional}),
        MAX(${votes.voteNumber}) FILTER (WHERE ${isRejection}),
        MAX(${votes.voteNumber})
      )`,
      title: votes.title,
      titleEn: max(votes.titleEn),
      date: max(votes.date),
      voteChoice: sql<string>`COALESCE(
        MAX(${votes.voteChoice}) FILTER (WHERE ${isFinal}),
        MAX(${votes.voteChoice}) FILTER (WHERE ${isProvisional}),
        MAX(${votes.voteChoice}) FILTER (WHERE ${isRejection}),
        (ARRAY_AGG(${votes.voteChoice} ORDER BY ${votes.voteNumber} DESC))[1]
      )`,
      result: sql<string | null>`COALESCE(
        MAX(${votes.result}) FILTER (WHERE ${isFinal}),
        MAX(${votes.result}) FILTER (WHERE ${isProvisional}),
        MAX(${votes.result}) FILTER (WHERE ${isRejection}),
        MAX(${votes.result})
      )`,
      votesFor: sql<number | null>`COALESCE(
        MAX(${votes.votesFor}) FILTER (WHERE ${isFinal}),
        MAX(${votes.votesFor}) FILTER (WHERE ${isProvisional}),
        MAX(${votes.votesFor}) FILTER (WHERE ${isRejection}),
        MAX(${votes.votesFor})
      )`,
      votesAgainst: sql<number | null>`COALESCE(
        MAX(${votes.votesAgainst}) FILTER (WHERE ${isFinal}),
        MAX(${votes.votesAgainst}) FILTER (WHERE ${isProvisional}),
        MAX(${votes.votesAgainst}) FILTER (WHERE ${isRejection}),
        MAX(${votes.votesAgainst})
      )`,
      votesAbstain: sql<number | null>`COALESCE(
        MAX(${votes.votesAbstain}) FILTER (WHERE ${isFinal}),
        MAX(${votes.votesAbstain}) FILTER (WHERE ${isProvisional}),
        MAX(${votes.votesAbstain}) FILTER (WHERE ${isRejection}),
        MAX(${votes.votesAbstain})
      )`,
      starsPoland: sql<number | null>`COALESCE(
        MAX(${votes.starsPoland}) FILTER (WHERE ${isFinal}),
        MAX(${votes.starsPoland}) FILTER (WHERE ${isProvisional}),
        MAX(${votes.starsPoland}) FILTER (WHERE ${isRejection}),
        MAX(${votes.starsPoland})
      )`,
      sessionId: votes.sessionId,
      relatedCount: sql<number>`GREATEST(COUNT(*) - 1, 0)::int`,
    })
    .from(votes)
    .where(
      and(
        eq(votes.mepId, mepId),
        eq(votes.isMain, true),
        sql`EXTRACT(YEAR FROM ${votes.date}) = ${year}`,
        sql`EXTRACT(MONTH FROM ${votes.date}) = ${month}`,
      ),
    )
    .groupBy(votes.title, votes.sessionId)
    .orderBy(sql`MAX(${votes.voteNumber}) ASC`)

  return votesList.map((v) => ({
    ...v,
    id: v.id ?? 0,
    title: v.title ?? '',
    titleEn: v.titleEn ?? '',
    date: v.date ?? new Date(),
  }))
}

export async function getMepSpeechesBySession(
  slug: string,
  startDate: Date,
  endDate: Date,
): Promise<Speech[]> {
  const mep = await db
    .select({ id: meps.id })
    .from(meps)
    .where(eq(meps.slug, slug))
    .limit(1)

  if (!mep[0]) return []

  return db
    .select()
    .from(speeches)
    .where(
      and(
        eq(speeches.mepId, mep[0].id),
        gte(speeches.speechDate, startDate),
        lte(speeches.speechDate, endDate),
      ),
    )
    .orderBy(asc(speeches.speechDate))
}

export async function getMepQuestionsBySession(
  slug: string,
  startDate: Date,
  endDate: Date,
): Promise<Question[]> {
  const mep = await db
    .select({ id: meps.id })
    .from(meps)
    .where(eq(meps.slug, slug))
    .limit(1)

  if (!mep[0]) return []

  return db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.mepId, mep[0].id),
        gte(questions.dateSubmitted, startDate),
        lte(questions.dateSubmitted, endDate),
      ),
    )
    .orderBy(asc(questions.dateSubmitted))
}

export async function getVoteSources(
  voteNumber: string,
): Promise<VoteSource[]> {
  const rows = await db
    .select({
      id: voteSources.id,
      voteNumber: voteSources.voteNumber,
      url: voteSources.url,
      name: voteSources.name,
      sourceType: voteSources.sourceType,
    })
    .from(voteSources)
    .where(eq(voteSources.voteNumber, voteNumber))
    .orderBy(
      sql`CASE ${voteSources.sourceType}
        WHEN 'REPORT'         THEN 1
        WHEN 'OEIL_SUMMARY'   THEN 2
        WHEN 'PROCEDURE_OEIL' THEN 3
        WHEN 'PRESS_RELEASE'  THEN 4
        WHEN 'VOT_XML'        THEN 5
        WHEN 'RCV_XML'        THEN 6
        ELSE 7
      END`,
    )

  return rows.map((r) => ({
    ...r,
    id: r.id ?? 0,
    voteNumber: r.voteNumber ?? voteNumber,
    url: r.url ?? '',
    name: r.name ?? '',
    sourceType: r.sourceType ?? '',
  }))
}

export async function getMepDocuments(slug: string): Promise<MepDocument[]> {
  const mep = await db
    .select({ id: meps.id })
    .from(meps)
    .where(eq(meps.slug, slug))
    .limit(1)
  if (!mep[0]) return []
  return db
    .select()
    .from(mepDocuments)
    .where(eq(mepDocuments.mepId, mep[0].id))
    .orderBy(desc(mepDocuments.documentDate))
}
