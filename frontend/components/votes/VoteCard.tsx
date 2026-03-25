import Link from 'next/link'
import type { BaseProps } from '@/lib/types'
import { cn } from '@/lib/utils'

type VoteCardVote = {
  id: number
  voteNumber?: string | null
  title: string
  date: Date | null
  result?: string | null
  starsPoland?: number | null
  topicCategory?: string | null
}

type VoteCardProps = BaseProps & {
  vote: VoteCardVote
}

export function VoteCard({
  vote,
  className,
  'data-testid': dataTestId,
  'data-cc': dataCc,
  id,
}: VoteCardProps) {
  return (
    <Link
      href={`/glosowania/${vote.voteNumber ?? vote.id}`}
      className={cn(
        'block rounded-md bg-surface-container-lowest p-4',
        'shadow-ambient transition-shadow hover:shadow-ambient-hover',
        className
      )}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      <h3 className="font-display mb-2 line-clamp-2 text-sm font-semibold text-on-surface">
        {vote.title}
      </h3>
      {vote.date && (
        <div className="mb-2 text-xs text-outline">
          {new Date(vote.date).toLocaleDateString('pl-PL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
          })}
        </div>
      )}
      <div className="flex items-center justify-between text-xs">
        {vote.starsPoland !== null && (
          <div className="flex items-center gap-1">
            <span className="font-medium text-on-surface-variant">
              {vote.starsPoland}⭐
            </span>
            <span className="text-outline">Polska</span>
          </div>
        )}
      </div>
      {vote.topicCategory && (
        <div className="mt-2">
          <span className="inline-block rounded bg-secondary-container px-2 py-0.5 text-xs font-medium text-on-secondary-container">
            {vote.topicCategory}
          </span>
        </div>
      )}
      {vote.result && (
        <div className="mt-2 text-xs">
          <span
            className={cn(
              'font-medium',
              vote.result === 'ADOPTED' && 'text-secondary',
              vote.result === 'REJECTED' && 'text-error'
            )}
          >
            {vote.result === 'ADOPTED' ? 'Przyjęto' : 'Odrzucono'}
          </span>
        </div>
      )}
    </Link>
  )
}
