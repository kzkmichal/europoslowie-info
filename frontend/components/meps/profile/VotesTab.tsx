import VoteMonthNav from '@/components/meps/VoteMonthNav'
import { VoteRow } from '@/components/votes/VoteRow'
import { Badge } from '@/components/ui/badge'
import type { MEPMonthSummary, MEPVote } from '@/lib/types'
import { MONTHS_PL, DAY_NAMES_PL } from '@/lib/constants'

function groupByDay(votes: MEPVote[]): Map<string, MEPVote[]> {
  const map = new Map<string, MEPVote[]>()
  for (const vote of votes) {
    const key = vote.date.toISOString().slice(0, 10)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(vote)
  }
  return map
}

type VotesTabProps = {
  monthList: MEPMonthSummary[]
  votes: MEPVote[]
  currentYear: number
  currentMonth: number
  slug: string
}

export const VotesTab = ({
  monthList,
  votes,
  currentYear,
  currentMonth,
  slug,
}: VotesTabProps) => {
  const votesByDay = groupByDay(votes)

  return (
    <div>
      <VoteMonthNav
        months={monthList}
        currentYear={currentYear}
        currentMonth={currentMonth}
        slug={slug}
        currentTab="votes"
      />
      {votes.length > 0 ? (
        <div className="space-y-6">
          {[...votesByDay.entries()].map(([dateKey, dayVotes]) => {
            const date = new Date(dateKey + 'T12:00:00')
            const dayLabel = `${DAY_NAMES_PL[date.getDay()]} ${date.getDate()} ${MONTHS_PL[date.getMonth()]} ${date.getFullYear()}`
            const forCount = dayVotes.filter(
              (v) => v.voteChoice === 'FOR',
            ).length
            const againstCount = dayVotes.filter(
              (v) => v.voteChoice === 'AGAINST',
            ).length
            const abstainCount = dayVotes.filter(
              (v) => v.voteChoice === 'ABSTAIN',
            ).length
            const absentCount = dayVotes.filter(
              (v) => v.voteChoice === 'ABSENT',
            ).length

            return (
              <div
                key={dateKey}
                className="bg-surface-container-low rounded-xl p-6"
              >
                <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-outline-variant/15 pb-4">
                  <h3 className="text-base font-bold text-primary">
                    {dayLabel}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {forCount > 0 && (
                      <Badge variant="voteFor" className="px-3 py-1 text-sm">
                        {forCount} za
                      </Badge>
                    )}
                    {againstCount > 0 && (
                      <Badge
                        variant="voteAgainst"
                        className="px-3 py-1 text-sm"
                      >
                        {againstCount} przeciw
                      </Badge>
                    )}
                    {abstainCount > 0 && (
                      <Badge
                        variant="voteAbstain"
                        className="px-3 py-1 text-sm"
                      >
                        {abstainCount} wstrz.
                      </Badge>
                    )}
                    {absentCount > 0 && (
                      <Badge variant="voteAbsent" className="px-3 py-1 text-sm">
                        {absentCount} nieob.
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {dayVotes.map((vote) => (
                    <VoteRow key={vote.id} vote={vote} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        monthList.length > 0 && (
          <p className="text-sm text-outline">
            Brak głosowań w {MONTHS_PL[currentMonth - 1].toLowerCase()}{' '}
            {currentYear}.
          </p>
        )
      )}
    </div>
  )
}
