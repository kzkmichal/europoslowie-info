import type { MonthlyStats } from '@/lib/db/schema'
import type { BaseProps } from '@/lib/types'
import { cn } from '@/lib/utils'

type StatsTableProps = BaseProps & {
  stats: MonthlyStats[]
}

const MONTHS_PL = [
  'sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
  'lip', 'sie', 'wrz', 'paź', 'lis', 'gru',
]

export function StatsTable({
  stats,
  className,
  'data-testid': dataTestId,
  'data-cc': dataCc,
  id,
}: StatsTableProps) {
  if (stats.length === 0) {
    return (
      <div className="text-sm text-gray-500">Brak danych statystycznych</div>
    )
  }

  const hasSpeeches = stats.some((s) => (s.speechesCount ?? 0) > 0)
  const hasQuestions = stats.some((s) => (s.questionsCount ?? 0) > 0)

  return (
    <div
      className={cn('overflow-x-auto', className)}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      <table className="min-w-full divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Miesiąc
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Obecność
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Za
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Przeciw
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Wstrz.
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Nieob.
            </th>
            {hasSpeeches && (
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Przemówienia
              </th>
            )}
            {hasQuestions && (
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Pytania
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {stats.map((stat) => (
            <tr key={stat.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                {MONTHS_PL[stat.month - 1]} {stat.year}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                <span
                  className={cn(
                    'font-semibold',
                    stat.attendanceRate >= 90 && 'text-green-600',
                    stat.attendanceRate >= 70 &&
                      stat.attendanceRate < 90 &&
                      'text-yellow-600',
                    stat.attendanceRate < 70 && 'text-red-600'
                  )}
                >
                  {stat.attendanceRate.toFixed(1)}%
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                {stat.votesFor}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                {stat.votesAgainst}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                {stat.votesAbstain}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                {stat.votesAbsent}
              </td>
              {hasSpeeches && (
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                  {stat.speechesCount ?? 0}
                </td>
              )}
              {hasQuestions && (
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                  {stat.questionsCount ?? 0}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
