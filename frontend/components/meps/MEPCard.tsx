import Link from 'next/link'
import type { MEPWithStats, BaseProps } from '@/lib/types'
import { cn } from '@/lib/utils'

type MEPCardProps = BaseProps & {
  mep: MEPWithStats
}

export function MEPCard({
  mep,
  className,
  'data-testid': dataTestId,
  'data-cc': dataCc,
  id,
}: MEPCardProps) {
  const stats = mep.latestStats

  return (
    <Link
      href={`/poslowie/${mep.slug}`}
      className={cn(
        'block rounded-lg border border-gray-200 bg-white p-6',
        'shadow-sm transition-shadow hover:shadow-md',
        className
      )}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{mep.fullName}</h3>
        <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
          {mep.nationalParty && (
            <>
              <span className="font-medium">{mep.nationalParty}</span>
              <span>•</span>
            </>
          )}
          {mep.epGroup && <span>{mep.epGroup}</span>}
        </div>
      </div>
      {stats ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Ranking:</span>
            <span className="font-semibold text-gray-900">
              {stats.rankingAmongPoles
                ? `#${stats.rankingAmongPoles} / 53`
                : 'Brak danych'}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Obecność:</span>
            <span className="font-semibold text-gray-900">
              {stats.attendanceRate.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Głosowania:</span>
            <span className="text-gray-900">
              {stats.totalVotes}{' '}
              <span className="text-xs text-gray-500">
                ({stats.votesFor} ZA, {stats.votesAgainst} PRZECIW,{' '}
                {stats.votesAbstain} WSTRZ)
              </span>
            </span>
          </div>

          {mep.topVote && (
            <div className="mt-4 rounded-md bg-blue-50 p-3">
              <div className="text-xs font-medium text-blue-900">
                Top głosowanie
                {mep.topVote.starsPoland && (
                  <span className="ml-1">({mep.topVote.starsPoland}⭐)</span>
                )}
              </div>
              <div className="mt-1 text-xs text-blue-700 line-clamp-2">
                {mep.topVote.title}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-500">Brak statystyk</div>
      )}
    </Link>
  )
}
