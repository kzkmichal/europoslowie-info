import type { MonthlyStats } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

const votes = (stats: MonthlyStats) => [
  { value: stats.votesFor,     label: 'ZA',      color: 'text-primary-container' },
  { value: stats.votesAgainst, label: 'Przeciw', color: 'text-error' },
  { value: stats.votesAbstain, label: 'Wstrz',   color: 'text-on-tertiary-fixed-variant' },
  { value: stats.votesAbsent,  label: 'Nieob',   color: 'text-outline' },
]

export const VoteGrid = ({ stats }: { stats: MonthlyStats }) => {
  return (
    <div className="grid grid-cols-4 gap-1 text-center">
      {votes(stats).map(({ value, label, color }) => (
        <div key={label}>
          <div className={cn('text-xl font-black leading-none', color)}>{value}</div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60 mt-1">{label}</div>
        </div>
      ))}
    </div>
  )
}
