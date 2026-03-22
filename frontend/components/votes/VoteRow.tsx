import { BaseProps, MEPVote } from '@/lib/types'
import { cn } from '@/lib/utils'

type VoteRowProps = BaseProps & {
  vote: MEPVote
}

export const VoteRow = ({ vote }: VoteRowProps) => {
  return (
    <div
      key={vote.id}
      className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-3"
    >
      <div
        className={cn(
          'w-24 shrink-0 rounded-full px-2 py-1 text-center text-xs font-semibold',
          vote.voteChoice === 'FOR' && 'bg-green-100 text-green-800',
          vote.voteChoice === 'AGAINST' && 'bg-red-100 text-red-800',
          vote.voteChoice === 'ABSTAIN' && 'bg-yellow-100 text-yellow-800',
          vote.voteChoice === 'ABSENT' && 'bg-gray-100 text-gray-600',
        )}
      >
        {vote.voteChoice === 'FOR' && 'Za'}
        {vote.voteChoice === 'AGAINST' && 'Przeciw'}
        {vote.voteChoice === 'ABSTAIN' && 'Wstrzymał się'}
        {vote.voteChoice === 'ABSENT' && 'Nieobecny'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{vote.title}</p>
      </div>
      {vote.relatedCount != null && vote.relatedCount > 0 && (
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          +{vote.relatedCount} głosowań
        </span>
      )}
      {vote.voteNumber && (
        <a
          href={`/glosowania/${vote.voteNumber}`}
          className="shrink-0 text-xs text-blue-600 hover:underline"
        >
          Szczegóły →
        </a>
      )}
    </div>
  )
}
