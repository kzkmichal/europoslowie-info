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
        'block rounded-lg border border-gray-200 bg-white p-4',
        'shadow-sm transition-shadow hover:shadow-md',
        className
      )}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-gray-900">
        {vote.title}
      </h3>
      {vote.date && (
        <div className="mb-2 text-xs text-gray-500">
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
            <span className="font-medium text-yellow-600">
              {vote.starsPoland}⭐
            </span>
            <span className="text-gray-500">Polska</span>
          </div>
        )}
        {/* 
        {vote.starsEurope !== null && (
          <div className="flex items-center gap-1">
            <span className="font-medium text-blue-600">
              {vote.starsEurope}⭐
            </span>
            <span className="text-gray-500">Europa</span>
          </div>
        )} */}
      </div>
      {vote.topicCategory && (
        <div className="mt-2">
          <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            {vote.topicCategory}
          </span>
        </div>
      )}
      {vote.result && (
        <div className="mt-2 text-xs">
          <span className="text-gray-600">Wynik: </span>
          <span
            className={cn(
              'font-medium',
              vote.result === 'ADOPTED' && 'text-green-600',
              vote.result === 'REJECTED' && 'text-red-600'
            )}
          >
            {vote.result === 'ADOPTED' ? 'Przyjęto' : 'Odrzucono'}
          </span>
        </div>
      )}
    </Link>
  )
}
