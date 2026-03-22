import Link from 'next/link'
import type { MEPWithStats, BaseProps } from '@/lib/types'
import { cn } from '@/lib/utils'

const MONTHS_PL = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
]

function getAttendanceLabel(rate: number): string {
  if (rate >= 90) return '🟢 Wysoka'
  if (rate >= 70) return '🟡 Średnia'
  return '🔴 Niska'
}

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
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Ostatnia sesja: {MONTHS_PL[stats.month - 1]} {stats.year}
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Obecność:</span>
            <span className="font-semibold text-gray-900">
              {getAttendanceLabel(stats.attendanceRate)}{' '}
              <span className="text-xs font-normal text-gray-500">
                ({stats.attendanceRate.toFixed(1)}%)
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Głosowania:</span>
            <span className="text-xs text-gray-700">
              {stats.votesFor} ZA · {stats.votesAgainst} PRZECIW · {stats.votesAbstain} WSTRZ · {stats.votesAbsent} nieob.
            </span>
          </div>
          {(stats.speechesCount || stats.questionsCount) ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Aktywność:</span>
              <span className="text-xs text-gray-700">
                {stats.speechesCount ? `${stats.speechesCount} przemówień` : null}
                {stats.speechesCount && stats.questionsCount ? ' · ' : null}
                {stats.questionsCount ? `${stats.questionsCount} pytań` : null}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-sm text-gray-500">Brak statystyk</div>
      )}
    </Link>
  )
}
