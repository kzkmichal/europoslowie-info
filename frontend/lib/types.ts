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
