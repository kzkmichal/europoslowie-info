'use client'

import { BaseProps, MEPMonthSummary } from '@/lib/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const MONTHS_PL = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
]

function toKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export type VoteMonthNavProps = BaseProps & {
  months: MEPMonthSummary[]
  currentYear: number
  currentMonth: number
  slug: string
}

const VoteMonthNav = ({
  months,
  currentYear,
  currentMonth,
  slug,
}: VoteMonthNavProps) => {
  const router = useRouter()

  if (months.length === 0) return null

  const currentKey = toKey(currentYear, currentMonth)
  const currentIndex = months.findIndex(
    (m) => m.year === currentYear && m.month === currentMonth,
  )
  const prevMonth = months[currentIndex - 1]
  const nextMonth = months[currentIndex + 1]

  const navLinkClass =
    'rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-2xl font-bold text-gray-900">
        Historia głosowań
      </h2>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={currentKey}
          onValueChange={(value) =>
            router.push(`/poslowie/${slug}?month=${value}`)
          }
        >
          <SelectTrigger className="w-auto min-w-52">
            <SelectValue placeholder="Wybierz miesiąc" />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem
                key={toKey(m.year, m.month)}
                value={toKey(m.year, m.month)}
              >
                {MONTHS_PL[m.month - 1]} {m.year}
                {m.location && (
                  <span className="ml-1 text-gray-400">· {m.location}</span>
                )}
                <span className="ml-1 text-gray-400">({m.voteCount})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          {prevMonth ? (
            <Link
              href={`/poslowie/${slug}?month=${toKey(prevMonth.year, prevMonth.month)}`}
              className={navLinkClass}
            >
              ← Poprzedni
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-md border border-input px-3 py-2 text-sm text-muted-foreground/40">
              ← Poprzedni
            </span>
          )}
          {nextMonth ? (
            <Link
              href={`/poslowie/${slug}?month=${toKey(nextMonth.year, nextMonth.month)}`}
              className={navLinkClass}
            >
              Następny →
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-md border border-input px-3 py-2 text-sm text-muted-foreground/40">
              Następny →
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

export default VoteMonthNav
