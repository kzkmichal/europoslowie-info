import type { MEP, MonthlyStats, Vote } from './schema'

export interface MEPWithStats {
  id: number
  slug: string
  fullName: string
  photoUrl: string | null
  nationalParty: string
  epGroup: string
  latestStats: MonthlyStats | null
  topVote: { id: number; title: string; starsPoland: number } | null
}

export interface MEPProfile extends MEP {
  monthlyStats: MonthlyStats[]
  topVotes: Vote[]
}
