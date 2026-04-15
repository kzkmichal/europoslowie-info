import type { SessionItem } from '@/lib/types'
import { MONTHS_PL } from '@/lib/constants'

const SESSION_TYPE_LABEL: Record<string, string> = {
  plenary: 'Głosowania plenarne',
  mini: 'Sesja dodatkowa',
}

const sessionTypeLabel = (type: string | null) =>
  type ? (SESSION_TYPE_LABEL[type.toLowerCase()] ?? type) : null

const formatDate = (start: Date, end: Date): string => {
  if (start.toDateString() === end.toDateString()) {
    return `${start.getDate()} ${MONTHS_PL[start.getMonth()]}`
  }
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS_PL[start.getMonth()]}`
  }
  return `${start.getDate()} ${MONTHS_PL[start.getMonth()]} – ${end.getDate()} ${MONTHS_PL[end.getMonth()]}`
}

export const SessionBlock = ({
  startDate,
  endDate,
  sessionType,
  adoptedVotes,
  rejectedVotes,
  totalVotes,
  keyVotes,
  importantVotes,
}: SessionItem) => (
  <div className="space-y-3 bg-surface-container-low rounded-xl p-5">
    <div>
      <h4 className="font-display text-lg font-black text-primary mb-1 tracking-tight">
        {formatDate(startDate, endDate)}
      </h4>
      {sessionTypeLabel(sessionType) && (
        <p className="text-[10px] font-black text-secondary uppercase tracking-[0.15em]">
          {sessionTypeLabel(sessionType)}
        </p>
      )}
    </div>

    <div className="flex flex-col gap-2 border-y border-outline-variant/10 py-3">
      <span className="text-xs font-black text-on-surface-variant">
        Wyniki głosowań:
      </span>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="font-display text-2xl font-black text-primary leading-none">
            {adoptedVotes}
          </div>
          <div className="text-[9px] font-black text-secondary uppercase tracking-wider mt-1 opacity-70">
            Przyjęto
          </div>
        </div>
        <div>
          <div className="font-display text-2xl font-black text-error leading-none">
            {rejectedVotes}
          </div>
          <div className="text-[9px] font-black text-secondary uppercase tracking-wider mt-1 opacity-70">
            Odrzucono
          </div>
        </div>
        <div>
          <div className="font-display text-2xl font-black text-secondary leading-none">
            {totalVotes}
          </div>
          <div className="text-[9px] font-black text-secondary uppercase tracking-wider mt-1 opacity-70">
            Łącznie
          </div>
        </div>
      </div>
    </div>

    {(keyVotes > 0 || importantVotes > 0) && (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-black text-on-surface-variant">
          Związane z Polską:
        </span>
        <div className="space-y-3">
          {keyVotes > 0 && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-on-surface flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />
                Kluczowe
              </span>
              <span className="font-black text-primary bg-error-container px-2 py-0.5 rounded">
                {keyVotes}
              </span>
            </div>
          )}
          {importantVotes > 0 && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-on-surface flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                Istotne
              </span>
              <span className="font-black text-primary bg-amber-50 px-2 py-0.5 rounded">
                {importantVotes}
              </span>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
)
