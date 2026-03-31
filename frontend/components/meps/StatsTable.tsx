'use client'

import { useState } from 'react'
import type { MonthlyStats } from '@/lib/db/schema'
import type { BaseProps } from '@/lib/types'
import { cn } from '@/lib/utils'

import { MONTHS_PL_ABBR, getAttendanceColor } from '@/lib/constants'

const INITIAL_ROWS = 6

type StatsTableProps = BaseProps & {
  stats: MonthlyStats[]
}

const TH = ({ children, center }: { children: React.ReactNode; center?: boolean }) => (
  <th
    scope="col"
    className={cn(
      'px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface',
      center && 'text-center',
    )}
  >
    {children}
  </th>
)

export const StatsTable = ({
  stats,
  className,
  'data-testid': dataTestId,
  'data-cc': dataCc,
  id,
}: StatsTableProps) => {
  const [expanded, setExpanded] = useState(false)

  if (stats.length === 0) {
    return <div className="text-sm text-outline">Brak danych statystycznych</div>
  }

  const hasSpeeches = stats.some((s) => (s.speechesCount ?? 0) > 0)
  const hasQuestions = stats.some((s) => (s.questionsCount ?? 0) > 0)
  const visible = expanded ? stats : stats.slice(0, INITIAL_ROWS)
  const hasMore = stats.length > INITIAL_ROWS

  return (
    <div
      className={cn('overflow-x-auto rounded-xl border border-outline-variant/30', className)}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-container-high">
            <TH>Miesiąc</TH>
            <TH>Obecność</TH>
            <TH center>Za</TH>
            <TH center>Przeciw</TH>
            <TH center>Wstrz.</TH>
            <TH center>Nieob.</TH>
            {hasSpeeches && <TH center>Przemówienia</TH>}
            {hasQuestions && <TH center>Pytania</TH>}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/10">
          {visible.map((stat) => (
            <tr key={stat.id} className="hover:bg-surface-container-lowest transition-colors">
              <td className="px-4 py-2 font-bold text-sm text-primary whitespace-nowrap">
                {MONTHS_PL_ABBR[stat.month - 1]} {stat.year}
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <span
                  className="text-sm font-bold"
                  style={{ color: getAttendanceColor(stat.attendanceRate) }}
                >
                  {stat.attendanceRate.toFixed(1)}%
                </span>
              </td>
              <td className="px-4 py-2 text-sm text-center font-medium text-on-surface">
                {stat.votesFor}
              </td>
              <td className="px-4 py-2 text-sm text-center font-medium text-on-error-container">
                {stat.votesAgainst}
              </td>
              <td className="px-4 py-2 text-sm text-center font-medium text-on-tertiary-fixed-variant">
                {stat.votesAbstain}
              </td>
              <td className="px-4 py-2 text-sm text-center font-medium text-on-surface-variant">
                {stat.votesAbsent}
              </td>
              {hasSpeeches && (
                <td className="px-4 py-2 text-sm text-center font-medium text-secondary">
                  {stat.speechesCount ?? 0}
                </td>
              )}
              {hasQuestions && (
                <td className="px-4 py-2 text-sm text-center font-medium text-secondary">
                  {stat.questionsCount ?? 0}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full py-2 text-xs font-semibold text-primary hover:bg-surface-container-low transition-colors border-t border-outline-variant/20"
        >
          {expanded ? 'Zwiń' : `Pokaż wszystkie ${stats.length} miesięcy`}
        </button>
      )}
    </div>
  )
}
