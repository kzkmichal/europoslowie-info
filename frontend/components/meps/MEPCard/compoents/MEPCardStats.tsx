import type { MonthlyStats } from '@/lib/db/schema'
import { cn } from '@/lib/utils'
import { VoteGrid } from './VoteGrid'
import { MONTHS_PL, getAttendance, statLabel, divider } from '../utils'

export const MEPCardStats = ({ stats }: { stats: MonthlyStats }) => {
  const att = getAttendance(stats.attendanceRate)

  return (
    <div className="bg-surface-container-low rounded-lg p-3">
      <p
        className="text-[10px] font-black uppercase tracking-[0.12em] text-on-surface-variant/60 font-display pb-3 mb-3"
        style={divider}
      >
        Sesja: {MONTHS_PL[stats.month - 1]} {stats.year}
      </p>

      <div
        className="flex items-center justify-between text-xs pb-3 mb-3"
        style={divider}
      >
        <span className={statLabel}>Obecność:</span>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: att.color }}
          />
          <span className="text-[10px] font-semibold text-on-surface-variant">
            {att.label} ({stats.attendanceRate.toFixed(1)}%)
          </span>
        </div>
      </div>

      <div className="pb-3 mb-3" style={divider}>
        <p className={cn(statLabel, 'mb-2')}>Głosowania:</p>
        <VoteGrid stats={stats} />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className={statLabel}>Aktywność:</span>
        <span className="text-on-surface-variant text-xs">
          {stats.speechesCount || stats.questionsCount ? (
            <>
              {stats.speechesCount ? `${stats.speechesCount} przemówień` : null}
              {stats.speechesCount && stats.questionsCount ? ' · ' : null}
              {stats.questionsCount ? `${stats.questionsCount} pytań` : null}
            </>
          ) : (
            <span className="text-outline">brak</span>
          )}
        </span>
      </div>
    </div>
  )
}
