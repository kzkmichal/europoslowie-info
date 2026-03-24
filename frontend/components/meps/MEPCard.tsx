import Link from 'next/link'
import Image from 'next/image'
import type { MEPWithStats, BaseProps } from '@/lib/types'
import { cn } from '@/lib/utils'

const MONTHS_PL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

function getAttendance(rate: number): {
  label: string
  dotClass: string
} {
  if (rate >= 90) return { label: 'High Attendance', dotClass: 'bg-on-primary-container' }
  if (rate >= 70) return { label: 'Medium Attendance', dotClass: 'bg-on-tertiary-container' }
  return { label: 'Low Attendance', dotClass: 'bg-error' }
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
  const primaryCommittee = mep.committees[0]

  return (
    <Link
      href={`/poslowie/${mep.slug}`}
      className={cn(
        'group block bg-surface-container-lowest rounded-xl p-6',
        'border border-outline-variant/10',
        'shadow-[0_12px_32px_-4px_rgba(25,28,29,0.04)]',
        'hover:shadow-[0_20px_48px_-8px_rgba(25,28,29,0.08)]',
        'transition-all duration-300',
        className
      )}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      {/* Header — photo + identity */}
      <div className="flex items-start gap-4 mb-6">
        {/* Photo */}
        <div className="relative w-20 h-20 shrink-0 overflow-hidden rounded-lg bg-surface-container-high">
          {mep.photoUrl ? (
            <Image
              src={mep.photoUrl}
              alt={mep.fullName}
              width={80}
              height={80}
              className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl font-bold text-on-surface-variant">
              {mep.fullName.charAt(0)}
            </div>
          )}
        </div>

        {/* Identity */}
        <div className="min-w-0">
          {/* EP group + national party chips */}
          <div className="flex flex-wrap gap-1 mb-2">
            {mep.epGroup && (
              <span className="px-2 py-0.5 bg-secondary-container/30 text-on-secondary-container text-[10px] font-bold uppercase tracking-wider rounded-full">
                {mep.epGroup}
              </span>
            )}
            {mep.nationalParty && (
              <span className="px-2 py-0.5 bg-surface-variant text-on-surface-variant text-[10px] font-bold uppercase tracking-wider rounded-full">
                {mep.nationalParty}
              </span>
            )}
          </div>

          {/* Name */}
          <h3 className="font-display font-extrabold text-xl text-primary leading-tight">
            {mep.fullName}
          </h3>

          {/* Primary committee */}
          {primaryCommittee && (
            <p className="text-secondary text-xs font-medium mt-1">
              {primaryCommittee.committeeName}
              {primaryCommittee.committeeCode && ` (${primaryCommittee.committeeCode})`}
            </p>
          )}
        </div>
      </div>

      {/* Stats box */}
      {stats ? (
        <div className="bg-surface-container-low rounded-lg p-4">
          {/* Session label + attendance */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-on-secondary-container/60 font-display">
              {MONTHS_PL[stats.month - 1]} {stats.year}
            </span>
            {(() => {
              const att = getAttendance(stats.attendanceRate)
              return (
                <div className="flex items-center gap-1.5">
                  <span className={cn('w-2 h-2 rounded-full', att.dotClass)} />
                  <span className="text-[10px] font-bold text-primary tracking-wide">
                    {att.label}
                  </span>
                </div>
              )
            })()}
          </div>

          {/* Vote counts */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="text-center">
              <div className="font-display font-black text-lg text-on-primary-container">
                {stats.votesFor}
              </div>
              <div className="text-[9px] font-bold text-secondary uppercase tracking-wide">
                Za
              </div>
            </div>
            <div className="text-center">
              <div className="font-display font-black text-lg text-error">
                {stats.votesAgainst}
              </div>
              <div className="text-[9px] font-bold text-secondary uppercase tracking-wide">
                Przeciw
              </div>
            </div>
            <div className="text-center">
              <div className="font-display font-black text-lg text-on-tertiary-fixed-variant">
                {stats.votesAbstain}
              </div>
              <div className="text-[9px] font-bold text-secondary uppercase tracking-wide">
                Wstrz
              </div>
            </div>
            <div className="text-center">
              <div className="font-display font-black text-lg text-outline">
                {stats.votesAbsent}
              </div>
              <div className="text-[9px] font-bold text-secondary uppercase tracking-wide">
                Nieob
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-3" style={{ borderTop: '1px solid rgba(196,198,209,0.10)' }}>
            <div className="w-full py-3.5 bg-gradient-to-br from-primary to-primary-container text-white text-[11px] font-display font-black uppercase tracking-[0.15em] rounded-lg text-center shadow-md group-hover:opacity-90 transition-opacity">
              Pełny profil głosowań
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-outline">Brak statystyk</div>
      )}
    </Link>
  )
}
