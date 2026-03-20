import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { BaseProps } from '@/lib/types'
import type { RelatedVote } from '@/lib/types'

type RelatedVotesListProps = BaseProps & {
  votes: RelatedVote[]
  /** The voteNumber of the currently-viewed vote, to highlight it */
  currentVoteNumber: string
}

function ResultBadge({ result }: { result: string | null }) {
  if (!result) return null
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
        result === 'ADOPTED' && 'bg-green-100 text-green-800',
        result === 'REJECTED' && 'bg-red-100 text-red-800',
        result === 'UNKNOWN' && 'bg-gray-100 text-gray-600',
      )}
    >
      {result === 'ADOPTED' ? 'Przyjęto' : result === 'REJECTED' ? 'Odrzucono' : result}
    </span>
  )
}

export function RelatedVotesList({
  votes,
  currentVoteNumber,
  className,
  'data-testid': dataTestId,
  'data-cc': dataCc,
  id,
}: RelatedVotesListProps) {
  if (votes.length === 0) return null

  return (
    <div
      className={cn('overflow-hidden rounded-lg border border-gray-200', className)}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-2 text-left font-medium text-gray-600">
              Przedmiot głosowania
            </th>
            <th className="px-4 py-2 text-center font-medium text-gray-600">
              Za / Przeciw / Wstrzym.
            </th>
            <th className="px-4 py-2 text-right font-medium text-gray-600">
              Wynik
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {votes.map((vote) => {
            const isCurrent = vote.voteNumber === currentVoteNumber
            return (
              <tr
                key={vote.voteNumber}
                className={cn(
                  'transition-colors',
                  isCurrent
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50',
                )}
              >
                {/* Description */}
                <td className="px-4 py-2.5">
                  {isCurrent ? (
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'font-medium',
                          vote.isMain ? 'text-gray-900' : 'text-gray-700',
                        )}
                      >
                        {vote.decLabel || vote.voteNumber}
                      </span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        bieżące
                      </span>
                    </span>
                  ) : (
                    <Link
                      href={`/glosowania/${vote.voteNumber}`}
                      className={cn(
                        'hover:underline',
                        vote.isMain ? 'font-medium text-gray-900' : 'text-gray-600',
                      )}
                    >
                      {vote.decLabel || vote.voteNumber}
                    </Link>
                  )}
                </td>

                {/* Vote counts */}
                <td className="px-4 py-2.5 text-center font-mono text-xs text-gray-500">
                  {vote.votesFor != null || vote.votesAgainst != null ? (
                    <span>
                      <span className="text-green-700">{vote.votesFor ?? '–'}</span>
                      {' / '}
                      <span className="text-red-700">{vote.votesAgainst ?? '–'}</span>
                      {' / '}
                      <span className="text-yellow-700">{vote.votesAbstain ?? '–'}</span>
                    </span>
                  ) : (
                    <span>–</span>
                  )}
                </td>

                {/* Result badge */}
                <td className="px-4 py-2.5 text-right">
                  <ResultBadge result={vote.result} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
