/**
 * Frontend Types
 *
 * These types describe the shape of data returned from query functions.
 * They extend database types from schema.ts with computed/joined data.
 */

import type { PropsWithChildren } from 'react'
import type {
  MEP,
  MonthlyStats,
  Vote,
  VoteItem,
  VotingSession,
  CommitteeMembership,
} from './db/schema'

// ==============================================================================
// Component Base Props
// ==============================================================================

export type BaseProps = {
  className?: string
  'data-testid'?: string
  'data-cc'?: string
  id?: string
}

export type WithChildrenProps = BaseProps & PropsWithChildren

// ==============================================================================
// Query Return Types
// ==============================================================================

/**
 * MEP with latest statistics and top vote
 * Used by: getAllMEPsWithStats() -> Homepage
 */
export type MEPWithStats = MEP & {
  latestStats: MonthlyStats | null
  topVote: {
    id: number
    title: string
    polandScore: number | null
  } | null
  committees: CommitteeMembership[]
}

/**
 * Full MEP profile with historical data
 * Used by: getMepBySlug() -> MEP Profile page
 */
export type MEPProfile = MEP & {
  monthlyStats: MonthlyStats[]
  topVotes: VoteItem[]
  committees: CommitteeMembership[]
}

/**
 * Basic MEP info (subset for vote details)
 */
export type MEPInfo = {
  id: number
  slug: string
  fullName: string
  nationalParty: string | null
  epGroup: string | null
  photoUrl: string | null
}

export type MEPSessionSummary = {
  id: number
  sessionNumber: string
  startDate: Date
  endDate: Date
  location: string | null
  year: number
  votesFor: number
  votesAgainst: number
  votesAbstain: number
  votesAbsent: number
}

export type MEPMonthSummary = {
  year: number
  month: number
  voteCount: number
  location: string | null
}

export type MEPActivityMonthSummary = {
  year: number
  month: number
  speechesCount: number
  questionsCount: number
}

/**
 * Vote with MEP info
 */
export type VoteWithMEP = {
  mep: MEPInfo
  voteChoice: string
}

/**
 * Complete vote details with Polish MEPs voting breakdown
 * Used by: getVoteById() -> Vote Details page
 */
export type VoteDetails = {
  vote: Vote
  voteItem?: VoteItem
  session: VotingSession
  polishVotes: {
    FOR: VoteWithMEP[]
    AGAINST: VoteWithMEP[]
    ABSTAIN: VoteWithMEP[]
    ABSENT: VoteWithMEP[]
  }
  summary: {
    for: number
    against: number
    abstain: number
    absent: number
  }
}

/**
 * Single vote entry for MEP vote history
 * Used by: getMepVotes() -> MEP Profile page (votes tab)
 */
export type MEPVote = {
  id: number
  voteNumber: string | null
  title: string
  titleEn: string | null
  date: Date
  voteChoice: string
  result: string | null
  votesFor: number | null
  votesAgainst: number | null
  votesAbstain: number | null
  polandScore: number | null
  sessionId: number
  relatedCount?: number
}

/**
 * Paginated MEP vote history
 * Used by: getMepVotes() -> MEP Profile page (votes tab)
 */
export type MEPVoteHistory = {
  votes: MEPVote[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

/**
 * One official EP source link for a vote
 * Used by: getVoteSources() -> /glosowania/[voteNumber] page
 */
export type VoteSource = {
  id: number
  voteNumber: string
  url: string
  name: string
  sourceType: string
}

/**
 * Single entry in the related votes list
 * Used by: getRelatedVotes() -> /glosowania/[voteNumber] page
 */
export type RelatedVote = {
  voteNumber: string
  decLabel: string | null
  result: string | null
  votesFor: number | null
  votesAgainst: number | null
  votesAbstain: number | null
  isMain: boolean
  isRepresentative: boolean
}

/**
 * Full vote details by voteNumber
 * Used by: getVoteDetails() -> /glosowania/[voteNumber] page
 */
export type VoteDetailsById = {
  voteNumber: string
  title: string
  titleEn: string | null
  date: Date
  result: string | null
  votesFor: number | null
  votesAgainst: number | null
  votesAbstain: number | null
  polandScore: number | null
  polandRelevanceData?: {
    relevance: 'kluczowe' | 'istotne' | 'neutralne'
    score: number
    reasoning: string
    key_factors: string[]
    low_confidence: boolean
  } | null
  documentReference: string | null
  documentUrl: string | null
  contextAi: string | null
  voteDescription: string | null
  topicCategory: string | null
  policyArea: string | null
  decLabel: string | null
  isMain: boolean | null
  isRepresentative: boolean
  session: {
    id: number
    sessionNumber: string
    startDate: Date
    location: string | null
  }
  polishVotes: {
    FOR: VoteWithMEP[]
    AGAINST: VoteWithMEP[]
    ABSTAIN: VoteWithMEP[]
    ABSENT: VoteWithMEP[]
  }
  summary: {
    for: number
    against: number
    abstain: number
    absent: number
  }
}

/**
 * One row in the EP group breakdown table
 * Used by: getEpGroupBreakdown() -> /glosowania/[voteNumber] page
 */
export type EpGroupRow = {
  epGroup: string
  for: number
  against: number
  abstain: number
  absent: number
  total: number
}

/**
 * Single vote entry for the global votes list
 * Used by: getVotesList() -> /glosowania page
 */
export type VoteListItem = {
  id: number
  voteNumber: string | null
  title: string
  titleEn: string | null
  date: Date
  result: string | null
  votesFor: number | null
  votesAgainst: number | null
  votesAbstain: number | null
  polandScore: number | null
  polishVotesFor: number | null
  polishVotesAgainst: number | null
  polishVotesAbstain: number | null
  polishVotesAbsent: number | null
  sessionId: number
  topicCategory: string | null
  relatedCount: number
}

/**
 * Paginated votes list
 * Used by: getVotesList() -> /glosowania page
 */
export type VotesList = {
  votes: VoteListItem[]
  page: number
  limit: number
  hasMore: boolean
}

export type SessionItem = {
  startDate: Date
  endDate: Date
  location: string | null
  sessionType: string | null
  totalVotes: number
  adoptedVotes: number
  rejectedVotes: number
  keyVotes: number
  importantVotes: number
}

/**
 * All sessions from the last month with per-session vote counts
 * Used by: getLastSession() -> Homepage
 */
export type LastSessionData = {
  year: number
  month: number
  sessions: SessionItem[]
} | null

export type UpcomingSessionItem = {
  startDate: Date
  endDate: Date
  location: string | null
  sessionType: string | null
}

/**
 * All sessions from the next upcoming month
 * Used by: getNextSession() -> Homepage
 */
export type UpcomingSessionData = {
  year: number
  month: number
  sessions: UpcomingSessionItem[]
} | null

// ==============================================================================
// Utility Types
// ==============================================================================

/**
 * Nullable fields helper
 */
export type Nullable<T> = T | null

/**
 * Make specific fields optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
