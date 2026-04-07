import Link from 'next/link'
import { CheckCircle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { BaseProps } from '@/lib/types'
import { cn } from '@/lib/utils'

type VoteCardVote = {
  id: number
  voteNumber?: string | null
  title: string
  date: Date | null
  result?: string | null
  polandScore?: number | null
  topicCategory?: string | null
  relatedCount?: number | null
}

type VoteCardProps = BaseProps & {
  vote: VoteCardVote
}

export const VoteCard = ({
  vote,
  className,
  'data-testid': dataTestId,
  'data-cc': dataCc,
  id,
}: VoteCardProps) => {
  const isAdopted = vote.result === 'ADOPTED'
  const isRejected = vote.result === 'REJECTED'

  return (
    <Link
      href={`/glosowania/${vote.voteNumber ?? vote.id}`}
      className={cn(
        'group flex flex-col justify-between',
        'rounded-xl bg-surface-container-lowest border border-outline-variant/10',
        'p-4 overflow-hidden relative',
        'hover:shadow-xl hover:shadow-primary/5 transition-all duration-300',
        className,
      )}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {vote.topicCategory && (
              <Badge className="bg-secondary-container/50 text-on-secondary-container border-secondary-container uppercase tracking-tighter font-bold">
                {vote.topicCategory}
              </Badge>
            )}
            {vote.polandScore != null && vote.polandScore >= 70 && (
              <Badge className="bg-red-100 text-red-800 border-red-200">
                🔴 Kluczowe
              </Badge>
            )}
            {vote.polandScore != null && vote.polandScore >= 40 && vote.polandScore < 70 && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                🟡 Istotne
              </Badge>
            )}
          </div>
          {(isAdopted || isRejected) && (
            <Badge variant={isAdopted ? 'voteFor' : 'voteAgainst'}>
              {isAdopted ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              {isAdopted ? 'Przyjęto' : 'Odrzucono'}
            </Badge>
          )}
        </div>
        <h3 className="text-base font-semibold text-primary group-hover:text-primary-container transition-colors leading-snug line-clamp-3">
          {vote.title}
        </h3>
        {vote.relatedCount != null && vote.relatedCount > 0 && (
          <p className="mt-2 text-xs text-outline">
            +{vote.relatedCount} głosowań powiązanych
          </p>
        )}
      </div>
    </Link>
  )
}
