import { unstable_cache } from 'next/cache'
import { db } from './index'
import {
  committeeMemberships,
  meps,
  mepDocuments,
  monthlyStats,
  votes,
  voteItems,
  votingSessions,
  voteSources,
  questions,
  speeches,
} from './schema'
import { eq, desc, and, sql, count, asc, gte, lte, getTableColumns } from 'drizzle-orm'
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
import type { VoteItem, Question, Speech, MepDocument } from './schema'

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
  mep_id: number
  id: number
  title: string
  poland_score: number | null
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
      SELECT DISTINCT ON (v.mep_id) v.mep_id, vi.id, vi.title, vi.poland_score
      FROM votes v
      JOIN vote_items vi ON vi.id = v.vote_item_id
      ORDER BY v.mep_id, vi.poland_score DESC NULLS LAST, vi.date DESC
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
        ? { id: v.id, title: v.title, polandScore: v.poland_score }
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
    .select(getTableColumns(voteItems))
    .from(votes)
    .innerJoin(voteItems, eq(votes.voteItemId, voteItems.id))
    .where(and(eq(votes.mepId, mep[0].id), sql`${voteItems.polandScore} >= 40`))
    .orderBy(desc(voteItems.polandScore), desc(voteItems.date))
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
  const voteItemRow = await db
    .select({
      voteItem: voteItems,
      session: votingSessions,
    })
    .from(votes)
    .innerJoin(voteItems, eq(votes.voteItemId, voteItems.id))
    .innerJoin(votingSessions, eq(voteItems.sessionId, votingSessions.id))
    .where(eq(votes.id, id))

  if (!voteItemRow[0]) return null

  const { voteItem, session } = voteItemRow[0]

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
    .where(and(eq(votes.voteItemId, voteItem.id), eq(meps.isActive, true)))
    .orderBy(votes.voteChoice, meps.nationalParty, meps.lastName)

  const groupedVotes = {
    FOR: polishVotes.filter((vote) => vote.voteChoice === 'FOR'),
    AGAINST: polishVotes.filter((vote) => vote.voteChoice === 'AGAINST'),
    ABSTAIN: polishVotes.filter((vote) => vote.voteChoice === 'ABSTAIN'),
    ABSENT: polishVotes.filter((vote) => vote.voteChoice === 'ABSENT'),
  }

  return {
    vote: {
      id,
      voteItemId: voteItem.id,
      mepId: 0,
      voteChoice: '',
    },
    voteItem,
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
  const voteItemRow = await db
    .select({
      voteNumber: voteItems.voteNumber,
      title: voteItems.title,
      titleEn: voteItems.titleEn,
      date: voteItems.date,
      result: voteItems.result,
      votesFor: voteItems.votesFor,
      votesAgainst: voteItems.votesAgainst,
      votesAbstain: voteItems.votesAbstain,
      polandScore: voteItems.polandScore,
      polandRelevanceData: voteItems.polandRelevanceData,
      documentReference: voteItems.documentReference,
      documentUrl: voteItems.documentUrl,
      contextAi: voteItems.contextAi,
      voteDescription: voteItems.voteDescription,
      topicCategory: voteItems.topicCategory,
      policyArea: voteItems.policyArea,
      decLabel: voteItems.decLabel,
      isMain: voteItems.isMain,
      isRepresentative: voteItems.isRepresentative,
      voteItemId: voteItems.id,
      session: {
        id: votingSessions.id,
        sessionNumber: votingSessions.sessionNumber,
        startDate: votingSessions.startDate,
        location: votingSessions.location,
      },
    })
    .from(voteItems)
    .innerJoin(votingSessions, eq(voteItems.sessionId, votingSessions.id))
    .where(eq(voteItems.voteNumber, voteNumber))
    .limit(1)

  if (!voteItemRow[0]) return null

  const { session, voteItemId, ...voteData } = voteItemRow[0]

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
    .where(and(eq(votes.voteItemId, voteItemId), eq(meps.isActive, true)))
    .orderBy(votes.voteChoice, meps.nationalParty, meps.lastName)

  const groupedVotes = {
    FOR: polishVotes.filter((v) => v.voteChoice === 'FOR'),
    AGAINST: polishVotes.filter((v) => v.voteChoice === 'AGAINST'),
    ABSTAIN: polishVotes.filter((v) => v.voteChoice === 'ABSTAIN'),
    ABSENT: polishVotes.filter((v) => v.voteChoice === 'ABSENT'),
  }

  return {
    ...voteData,
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
): Promise<VoteItem[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  return db
    .select()
    .from(voteItems)
    .where(
      and(
        sql`${voteItems.polandScore} >= 70`,
        sql`${voteItems.date} >= ${startDate}::date`,
        sql`${voteItems.date} <= ${endDate}::date`,
      ),
    )
    .orderBy(desc(voteItems.date))
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

  const conditions = [
    eq(votes.mepId, mepId),
    eq(voteItems.isRepresentative, true),
  ]
  if (voteChoice) {
    conditions.push(eq(votes.voteChoice, voteChoice))
  }

  const [totalResult, votesList] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(votes)
      .innerJoin(voteItems, eq(votes.voteItemId, voteItems.id))
      .where(and(...conditions)),

    db
      .select({
        id: voteItems.id,
        voteNumber: voteItems.voteNumber,
        title: voteItems.title,
        titleEn: voteItems.titleEn,
        date: voteItems.date,
        voteChoice: votes.voteChoice,
        result: voteItems.result,
        votesFor: voteItems.votesFor,
        votesAgainst: voteItems.votesAgainst,
        votesAbstain: voteItems.votesAbstain,
        polandScore: voteItems.polandScore,
        sessionId: voteItems.sessionId,
        relatedCount: voteItems.relatedCount,
      })
      .from(votes)
      .innerJoin(voteItems, eq(votes.voteItemId, voteItems.id))
      .where(and(...conditions))
      .orderBy(desc(voteItems.date), desc(voteItems.id))
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
      sessionId: v.sessionId ?? 0,
    })),
    total,
    page,
    limit,
    hasMore: offset + votesList.length < total,
  }
}

export async function getTopicCategories(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ topicCategory: voteItems.topicCategory })
    .from(voteItems)
    .where(sql`${voteItems.topicCategory} IS NOT NULL`)
    .orderBy(asc(voteItems.topicCategory))

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

  const conditions = [eq(voteItems.isRepresentative, true)]
  if (year && month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]
    conditions.push(sql`${voteItems.date} >= ${startDate}::date`)
    conditions.push(sql`${voteItems.date} <= ${endDate}::date`)
  } else if (year) {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`
    conditions.push(sql`${voteItems.date} >= ${startDate}::date`)
    conditions.push(sql`${voteItems.date} <= ${endDate}::date`)
  }

  if (result) {
    conditions.push(eq(voteItems.result, result))
  }

  if (search) {
    conditions.push(sql`${voteItems.title} ILIKE ${'%' + search + '%'}`)
  }

  if (topic) {
    conditions.push(eq(voteItems.topicCategory, topic))
  }

  const whereClause = and(...conditions)

  const votesList = await db
    .select({
      id: voteItems.id,
      voteNumber: voteItems.voteNumber,
      title: voteItems.title,
      titleEn: voteItems.titleEn,
      date: voteItems.date,
      result: voteItems.result,
      votesFor: voteItems.votesFor,
      votesAgainst: voteItems.votesAgainst,
      votesAbstain: voteItems.votesAbstain,
      polandScore: voteItems.polandScore,
      polishVotesFor: voteItems.polishVotesFor,
      polishVotesAgainst: voteItems.polishVotesAgainst,
      polishVotesAbstain: voteItems.polishVotesAbstain,
      polishVotesAbsent: voteItems.polishVotesAbsent,
      sessionId: voteItems.sessionId,
      topicCategory: voteItems.topicCategory,
      relatedCount: voteItems.relatedCount,
    })
    .from(voteItems)
    .where(whereClause)
    .orderBy(desc(voteItems.date), desc(voteItems.id))
    .limit(limit + 1)
    .offset(offset)

  const hasMore = votesList.length > limit
  const pageVotes = hasMore ? votesList.slice(0, limit) : votesList

  return {
    votes: pageVotes.map((v) => ({
      ...v,
      date: v.date ?? new Date(),
      sessionId: v.sessionId ?? 0,
    })),
    page,
    limit,
    hasMore,
  }
}

export const getVotesList = unstable_cache(_getVotesList, ['votes-list'], {
  revalidate: 300,
  tags: ['votes-list'],
})

export async function getCurrentMonthTopVotes(): Promise<VoteItem[]> {
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
    .innerJoin(voteItems, eq(votes.voteItemId, voteItems.id))
    .where(and(eq(voteItems.voteNumber, voteNumber), eq(meps.isActive, true)))
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
  const voteItemRow = await db
    .select({ title: voteItems.title, sessionId: voteItems.sessionId })
    .from(voteItems)
    .where(eq(voteItems.voteNumber, voteNumber))
    .limit(1)

  if (!voteItemRow[0]) return []

  const { title, sessionId } = voteItemRow[0]

  const related = await db
    .select({
      voteNumber: voteItems.voteNumber,
      decLabel: voteItems.decLabel,
      result: voteItems.result,
      votesFor: voteItems.votesFor,
      votesAgainst: voteItems.votesAgainst,
      votesAbstain: voteItems.votesAbstain,
      isMain: voteItems.isMain,
      isRepresentative: voteItems.isRepresentative,
    })
    .from(voteItems)
    .where(
      and(
        eq(voteItems.title, title),
        sessionId != null ? eq(voteItems.sessionId, sessionId) : sql`false`,
      ),
    )
    .orderBy(voteItems.voteNumber)

  if (related.length <= 1) return []

  return related.map((r) => ({
    voteNumber: r.voteNumber,
    decLabel: r.decLabel ?? null,
    result: r.result ?? null,
    votesFor: r.votesFor ?? null,
    votesAgainst: r.votesAgainst ?? null,
    votesAbstain: r.votesAbstain ?? null,
    isMain: r.isMain,
    isRepresentative: r.isRepresentative,
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
    .innerJoin(voteItems, eq(votes.voteItemId, voteItems.id))
    .innerJoin(votingSessions, eq(voteItems.sessionId, votingSessions.id))
    .where(and(eq(votes.mepId, mepId), eq(voteItems.isMain, true)))
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
      id: voteItems.id,
      voteNumber: voteItems.voteNumber,
      title: voteItems.title,
      titleEn: voteItems.titleEn,
      date: voteItems.date,
      voteChoice: votes.voteChoice,
      result: voteItems.result,
      votesFor: voteItems.votesFor,
      votesAgainst: voteItems.votesAgainst,
      votesAbstain: voteItems.votesAbstain,
      polandScore: voteItems.polandScore,
      sessionId: voteItems.sessionId,
      relatedCount: voteItems.relatedCount,
    })
    .from(votes)
    .innerJoin(voteItems, eq(votes.voteItemId, voteItems.id))
    .where(
      and(
        eq(votes.mepId, mepId),
        eq(voteItems.isRepresentative, true),
        eq(voteItems.sessionId, sessionId),
      ),
    )
    .orderBy(asc(voteItems.voteNumber))

  return votesList.map((v) => ({
    ...v,
    id: v.id ?? 0,
    title: v.title ?? '',
    titleEn: v.titleEn ?? '',
    date: v.date ?? new Date(),
    sessionId: v.sessionId ?? 0,
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
      year: sql<number>`EXTRACT(YEAR FROM ${voteItems.date})::int`,
      month: sql<number>`EXTRACT(MONTH FROM ${voteItems.date})::int`,
      voteCount: sql<number>`COUNT(DISTINCT ${voteItems.title})::int`,
      location: sql<string | null>`MAX(${votingSessions.location})`,
    })
    .from(votes)
    .innerJoin(voteItems, eq(votes.voteItemId, voteItems.id))
    .innerJoin(votingSessions, eq(voteItems.sessionId, votingSessions.id))
    .where(and(eq(votes.mepId, mep[0].id), eq(voteItems.isMain, true)))
    .groupBy(
      sql`EXTRACT(YEAR FROM ${voteItems.date})`,
      sql`EXTRACT(MONTH FROM ${voteItems.date})`,
    )
    .orderBy(
      desc(sql`EXTRACT(YEAR FROM ${voteItems.date})`),
      desc(sql`EXTRACT(MONTH FROM ${voteItems.date})`),
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

  const votesList = await db
    .select({
      id: voteItems.id,
      voteNumber: voteItems.voteNumber,
      title: voteItems.title,
      titleEn: voteItems.titleEn,
      date: voteItems.date,
      voteChoice: votes.voteChoice,
      result: voteItems.result,
      votesFor: voteItems.votesFor,
      votesAgainst: voteItems.votesAgainst,
      votesAbstain: voteItems.votesAbstain,
      polandScore: voteItems.polandScore,
      sessionId: voteItems.sessionId,
      relatedCount: voteItems.relatedCount,
    })
    .from(votes)
    .innerJoin(voteItems, eq(votes.voteItemId, voteItems.id))
    .where(
      and(
        eq(votes.mepId, mepId),
        eq(voteItems.isRepresentative, true),
        sql`EXTRACT(YEAR FROM ${voteItems.date}) = ${year}`,
        sql`EXTRACT(MONTH FROM ${voteItems.date}) = ${month}`,
      ),
    )
    .orderBy(asc(voteItems.voteNumber))

  return votesList.map((v) => ({
    ...v,
    id: v.id ?? 0,
    title: v.title ?? '',
    titleEn: v.titleEn ?? '',
    date: v.date ?? new Date(),
    sessionId: v.sessionId ?? 0,
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
