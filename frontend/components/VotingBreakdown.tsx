import type { BaseProps } from '@/lib/types'
import { cn } from '@/lib/utils'

type VotingBreakdownProps = BaseProps & {
  summary: {
    for: number
    against: number
    abstain: number
    absent: number
  }
}

export function VotingBreakdown({
  summary,
  className,
  'data-testid': dataTestId,
  'data-cc': dataCc,
  id,
}: VotingBreakdownProps) {
  const total = summary.for + summary.against + summary.abstain + summary.absent

  const getPercentage = (count: number) => {
    if (total === 0) return 0
    return ((count / total) * 100).toFixed(1)
  }

  return (
    <div
      className={cn('space-y-4', className)}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      <div className="flex h-12 overflow-hidden rounded-lg">
        {summary.for > 0 && (
          <div
            className="flex items-center justify-center bg-green-500 text-xs font-semibold text-white"
            style={{ width: `${getPercentage(summary.for)}%` }}
          >
            {summary.for > 0 && getPercentage(summary.for) !== '0.0' && (
              <span>{summary.for}</span>
            )}
          </div>
        )}
        {summary.against > 0 && (
          <div
            className="flex items-center justify-center bg-red-500 text-xs font-semibold text-white"
            style={{ width: `${getPercentage(summary.against)}%` }}
          >
            {summary.against > 0 &&
              getPercentage(summary.against) !== '0.0' && (
                <span>{summary.against}</span>
              )}
          </div>
        )}
        {summary.abstain > 0 && (
          <div
            className="flex items-center justify-center bg-yellow-500 text-xs font-semibold text-white"
            style={{ width: `${getPercentage(summary.abstain)}%` }}
          >
            {summary.abstain > 0 &&
              getPercentage(summary.abstain) !== '0.0' && (
                <span>{summary.abstain}</span>
              )}
          </div>
        )}
        {summary.absent > 0 && (
          <div
            className="flex items-center justify-center bg-gray-400 text-xs font-semibold text-white"
            style={{ width: `${getPercentage(summary.absent)}%` }}
          >
            {summary.absent > 0 && getPercentage(summary.absent) !== '0.0' && (
              <span>{summary.absent}</span>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
          <div className="text-sm font-medium text-green-700">Za</div>
          <div className="mt-1 text-2xl font-bold text-green-900">
            {summary.for}
          </div>
          <div className="mt-1 text-xs text-green-600">
            {getPercentage(summary.for)}%
          </div>
        </div>
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
          <div className="text-sm font-medium text-red-700">Przeciw</div>
          <div className="mt-1 text-2xl font-bold text-red-900">
            {summary.against}
          </div>
          <div className="mt-1 text-xs text-red-600">
            {getPercentage(summary.against)}%
          </div>
        </div>
        <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4">
          <div className="text-sm font-medium text-yellow-700">
            Wstrzymało się
          </div>
          <div className="mt-1 text-2xl font-bold text-yellow-900">
            {summary.abstain}
          </div>
          <div className="mt-1 text-xs text-yellow-600">
            {getPercentage(summary.abstain)}%
          </div>
        </div>
        <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
          <div className="text-sm font-medium text-gray-700">Nieobecni</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {summary.absent}
          </div>
          <div className="mt-1 text-xs text-gray-600">
            {getPercentage(summary.absent)}%
          </div>
        </div>
      </div>
      <div className="text-center text-sm text-gray-600">
        Łącznie: <span className="font-semibold">{total}</span> polskich posłów
      </div>
    </div>
  )
}
