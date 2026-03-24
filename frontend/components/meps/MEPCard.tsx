import Link from 'next/link'
import Image from 'next/image'
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
        'block rounded-md bg-surface-container-lowest p-6',
        'shadow-ambient transition-shadow hover:shadow-ambient-hover',
        className
      )}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface-container-high">
          {mep.photoUrl ? (
            <Image
              src={mep.photoUrl}
              alt={mep.fullName}
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-lg font-bold text-on-surface-variant">
              {mep.fullName.charAt(0)}
            </div>
          )}
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-on-surface">{mep.fullName}</h3>
          <div className="mt-1 flex items-center gap-2 text-sm text-on-surface-variant">
            {mep.nationalParty && (
              <>
                <span className="font-medium">{mep.nationalParty}</span>
                <span>•</span>
              </>
            )}
            {mep.epGroup && <span>{mep.epGroup}</span>}
          </div>
        </div>
      </div>
      {stats ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-widest text-outline">
            {MONTHS_PL[stats.month - 1]} {stats.year}
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">Obecność:</span>
            <span className="font-semibold text-on-surface">
              {getAttendanceLabel(stats.attendanceRate)}{' '}
              <span className="text-xs font-normal text-outline">
                ({stats.attendanceRate.toFixed(1)}%)
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">Głosowania:</span>
            <span className="text-xs text-on-surface-variant">
              {stats.votesFor} ZA · {stats.votesAgainst} PRZECIW · {stats.votesAbstain} WSTRZ · {stats.votesAbsent} nieob.
            </span>
          </div>
          {(stats.speechesCount || stats.questionsCount) ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Aktywność:</span>
              <span className="text-xs text-on-surface-variant">
                {stats.speechesCount ? `${stats.speechesCount} przemówień` : null}
                {stats.speechesCount && stats.questionsCount ? ' · ' : null}
                {stats.questionsCount ? `${stats.questionsCount} pytań` : null}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-sm text-outline">Brak statystyk</div>
      )}
    </Link>
  )
}
