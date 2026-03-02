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
    starsPoland: number | null
  } | null
}

/**
 * Full MEP profile with historical data
 * Used by: getMepBySlug() -> MEP Profile page
 */
export type MEPProfile = MEP & {
  monthlyStats: MonthlyStats[]
  topVotes: Vote[]
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
  starsPoland: number | null
  sessionId: number
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
  starsPoland: number | null
  documentReference: string | null
  documentUrl: string | null
  contextAi: string | null
  topicCategory: string | null
  policyArea: string | null
  decLabel: string | null
  isMain: boolean | null
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
  starsPoland: number | null
  polishVotesFor: number | null
  polishVotesAgainst: number | null
  polishVotesAbstain: number | null
  polishVotesAbsent: number | null
  sessionId: number
}

/**
 * Paginated votes list
 * Used by: getVotesList() -> /glosowania page
 */
export type VotesList = {
  votes: VoteListItem[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

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
