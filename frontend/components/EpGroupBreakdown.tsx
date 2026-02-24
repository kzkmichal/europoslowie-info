import { cn } from '@/lib/utils'
import type { BaseProps, EpGroupRow } from '@/lib/types'

type EpGroupBreakdownProps = BaseProps & {
  rows: EpGroupRow[]
}

/** Short colored bar representing a group's voting split */
function MiniBar({ row }: { row: EpGroupRow }) {
  const { for: f, against: a, abstain: ab, absent: abs, total } = row
  if (total === 0) return null
  const pct = (n: number) => ((n / total) * 100).toFixed(1)
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
      {f > 0 && (
        <div
          className="bg-green-500"
          style={{ width: `${pct(f)}%` }}
          title={`Za: ${f}`}
        />
      )}
      {a > 0 && (
        <div
          className="bg-red-500"
          style={{ width: `${pct(a)}%` }}
          title={`Przeciw: ${a}`}
        />
      )}
      {ab > 0 && (
        <div
          className="bg-yellow-400"
          style={{ width: `${pct(ab)}%` }}
          title={`Wstrzymało się: ${ab}`}
        />
      )}
      {abs > 0 && (
        <div
          className="bg-gray-300"
          style={{ width: `${pct(abs)}%` }}
          title={`Nieobecni: ${abs}`}
        />
      )}
    </div>
  )
}

function Cell({
  value,
  variant,
}: {
  value: number
  variant: 'for' | 'against' | 'abstain' | 'absent'
}) {
  if (value === 0) return <td className="px-3 py-2.5 text-center text-gray-300">–</td>
  return (
    <td
      className={cn(
        'px-3 py-2.5 text-center font-semibold tabular-nums',
        variant === 'for' && 'text-green-700',
        variant === 'against' && 'text-red-700',
        variant === 'abstain' && 'text-yellow-700',
        variant === 'absent' && 'text-gray-400',
      )}
    >
      {value}
    </td>
  )
}

export function EpGroupBreakdown({
  rows,
  className,
  'data-testid': dataTestId,
  'data-cc': dataCc,
  id,
}: EpGroupBreakdownProps) {
  if (rows.length === 0) return null

  return (
    <div
      className={cn('overflow-hidden rounded-lg border border-gray-200', className)}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-3 py-2 text-left font-medium text-gray-600">
              Grupa
            </th>
            <th className="hidden px-3 py-2 text-left font-medium text-gray-600 sm:table-cell">
              Rozkład
            </th>
            <th className="px-3 py-2 text-center font-medium text-green-700">
              Za
            </th>
            <th className="px-3 py-2 text-center font-medium text-red-700">
              Przeciw
            </th>
            <th className="px-3 py-2 text-center font-medium text-yellow-700">
              Wstrz.
            </th>
            <th className="px-3 py-2 text-center font-medium text-gray-400">
              Nieob.
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.epGroup} className="hover:bg-gray-50">
              <td className="px-3 py-2.5 font-medium text-gray-800">
                {row.epGroup}
              </td>
              <td className="hidden px-3 py-2.5 sm:table-cell">
                <MiniBar row={row} />
              </td>
              <Cell value={row.for} variant="for" />
              <Cell value={row.against} variant="against" />
              <Cell value={row.abstain} variant="abstain" />
              <Cell value={row.absent} variant="absent" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
