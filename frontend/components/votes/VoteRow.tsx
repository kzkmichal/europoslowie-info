import { BaseProps, MEPVote } from '@/lib/types'
import { cn } from '@/lib/utils'

type VoteRowProps = BaseProps & {
  vote: MEPVote
}

export const VoteRow = ({ vote }: VoteRowProps) => {
  return (
    <div
      key={vote.id}
      className="flex items-center gap-4 rounded-md bg-surface-container-lowest p-3 shadow-ambient"
    >
      <div
        className={cn(
          'w-24 shrink-0 rounded px-2 py-1 text-center text-xs font-semibold',
          vote.voteChoice === 'FOR' &&
            'bg-on-primary-container text-primary',
          vote.voteChoice === 'AGAINST' &&
            'bg-error-container text-on-error-container',
          vote.voteChoice === 'ABSTAIN' &&
            'bg-tertiary-fixed text-on-tertiary-fixed-variant',
          vote.voteChoice === 'ABSENT' &&
            'bg-surface-container-high text-on-surface-variant',
        )}
      >
        {vote.voteChoice === 'FOR' && 'Za'}
        {vote.voteChoice === 'AGAINST' && 'Przeciw'}
        {vote.voteChoice === 'ABSTAIN' && 'Wstrzymał się'}
        {vote.voteChoice === 'ABSENT' && 'Nieobecny'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-on-surface">{vote.title}</p>
      </div>
      {vote.result && (
        <span
          className={cn(
            'shrink-0 rounded px-2 py-0.5 text-xs font-medium',
            vote.result === 'ADOPTED' &&
              'bg-secondary-container text-on-secondary-container',
            vote.result === 'REJECTED' &&
              'bg-error-container text-on-error-container',
          )}
        >
          {vote.result === 'ADOPTED' ? 'Przyjęto' : 'Odrzucono'}
        </span>
      )}
      {vote.relatedCount != null && vote.relatedCount > 0 && (
        <span className="shrink-0 rounded bg-surface-container-high px-2 py-0.5 text-xs text-on-surface-variant">
          +{vote.relatedCount} głosowań
        </span>
      )}
      {vote.voteNumber && (
        <a
          href={`/glosowania/${vote.voteNumber}`}
          className="shrink-0 text-xs text-secondary hover:underline"
        >
          Szczegóły →
        </a>
      )}
    </div>
  )
}
