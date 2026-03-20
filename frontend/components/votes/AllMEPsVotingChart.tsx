import { cn } from '@/lib/utils'
import type { BaseProps } from '@/lib/types'

type AllMEPsVotingChartProps = BaseProps & {
  votesFor: number | null
  votesAgainst: number | null
  votesAbstain: number | null
}

export function AllMEPsVotingChart({
  votesFor,
  votesAgainst,
  votesAbstain,
  className,
  'data-testid': dataTestId,
  'data-cc': dataCc,
  id,
}: AllMEPsVotingChartProps) {
  const forCount = votesFor ?? 0
  const againstCount = votesAgainst ?? 0
  const abstainCount = votesAbstain ?? 0
  const total = forCount + againstCount + abstainCount

  if (total === 0) return null

  const pct = (n: number) =>
    total === 0 ? 0 : parseFloat(((n / total) * 100).toFixed(1))

  const forPct = pct(forCount)
  const againstPct = pct(againstCount)
  const abstainPct = pct(abstainCount)

  return (
    <div
      className={cn('space-y-4', className)}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      {/* Stacked bar */}
      <div className="flex h-12 overflow-hidden rounded-lg">
        {forCount > 0 && (
          <div
            className="flex items-center justify-center bg-green-500 text-xs font-semibold text-white"
            style={{ width: `${forPct}%` }}
            title={`Za: ${forCount} (${forPct}%)`}
          >
            {forPct >= 5 && <span>{forCount}</span>}
          </div>
        )}
        {againstCount > 0 && (
          <div
            className="flex items-center justify-center bg-red-500 text-xs font-semibold text-white"
            style={{ width: `${againstPct}%` }}
            title={`Przeciw: ${againstCount} (${againstPct}%)`}
          >
            {againstPct >= 5 && <span>{againstCount}</span>}
          </div>
        )}
        {abstainCount > 0 && (
          <div
            className="flex items-center justify-center bg-yellow-500 text-xs font-semibold text-white"
            style={{ width: `${abstainPct}%` }}
            title={`Wstrzymało się: ${abstainCount} (${abstainPct}%)`}
          >
            {abstainPct >= 5 && <span>{abstainCount}</span>}
          </div>
        )}
      </div>

      {/* Count boxes */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
          <div className="text-sm font-medium text-green-700">Za</div>
          <div className="mt-1 text-2xl font-bold text-green-900">
            {forCount.toLocaleString('pl-PL')}
          </div>
          <div className="mt-1 text-xs text-green-600">{forPct}%</div>
        </div>
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
          <div className="text-sm font-medium text-red-700">Przeciw</div>
          <div className="mt-1 text-2xl font-bold text-red-900">
            {againstCount.toLocaleString('pl-PL')}
          </div>
          <div className="mt-1 text-xs text-red-600">{againstPct}%</div>
        </div>
        <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4">
          <div className="text-sm font-medium text-yellow-700">
            Wstrzymało się
          </div>
          <div className="mt-1 text-2xl font-bold text-yellow-900">
            {abstainCount.toLocaleString('pl-PL')}
          </div>
          <div className="mt-1 text-xs text-yellow-600">{abstainPct}%</div>
        </div>
      </div>

      <div className="text-center text-sm text-gray-600">
        Łącznie:
        <span className="font-semibold">{total.toLocaleString('pl-PL')}</span>
        europosłów
      </div>
    </div>
  )
}
