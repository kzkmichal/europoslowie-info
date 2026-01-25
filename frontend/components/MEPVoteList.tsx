import Link from 'next/link'
import type { VoteWithMEP, BaseProps } from '@/lib/types'
import { cn } from '@/lib/utils'

type MEPVoteListProps = BaseProps & {
  votes: VoteWithMEP[]
  variant: 'for' | 'against' | 'abstain' | 'absent'
}

export function MEPVoteList({
  votes,
  variant,
  className,
  'data-testid': dataTestId,
  'data-cc': dataCc,
  id,
}: MEPVoteListProps) {
  const variantStyles = {
    for: 'border-green-200 bg-green-50 hover:bg-green-100',
    against: 'border-red-200 bg-red-50 hover:bg-red-100',
    abstain: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100',
    absent: 'border-gray-200 bg-gray-50 hover:bg-gray-100',
  }

  if (votes.length === 0) {
    return null
  }

  return (
    <div
      className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      {votes.map((vote) => (
        <Link
          key={vote.mep.id}
          href={`/poslowie/${vote.mep.slug}`}
          className={cn(
            'block rounded-lg border p-3 transition-colors',
            variantStyles[variant]
          )}
        >
          <div className="font-medium text-gray-900">{vote.mep.fullName}</div>
          {vote.mep.nationalParty && (
            <div className="mt-1 text-xs text-gray-600">
              {vote.mep.nationalParty}
              {vote.mep.epGroup && (
                <>
                  {' • '}
                  {vote.mep.epGroup}
                </>
              )}
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}
