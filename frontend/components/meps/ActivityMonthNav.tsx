'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MEPActivityMonthSummary } from '@/lib/types'
import { MONTHS_PL } from '@/lib/constants'
import { toMonthKey } from '@/lib/utils'

type ActivityMonthNavProps = {
  months: MEPActivityMonthSummary[]
  currentYear: number
  currentMonth: number
  slug: string
}

const ActivityMonthNav = ({
  months,
  currentYear,
  currentMonth,
  slug,
}: ActivityMonthNavProps) => {
  const router = useRouter()

  if (months.length === 0) return null

  const currentKey = toMonthKey(currentYear, currentMonth)
  const currentIndex = months.findIndex(
    (m) => m.year === currentYear && m.month === currentMonth,
  )
  const validKey = currentIndex >= 0 ? currentKey : undefined
  const prevMonth = months[currentIndex - 1]
  const nextMonth = months[currentIndex + 1]

  const buildUrl = (monthKey: string) => {
    const params = new URLSearchParams()
    params.set('month', monthKey)
    params.set('tab', 'activity')
    return `/poslowie/${slug}?${params.toString()}`
  }

  const navLinkClass =
    'rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'

  return (
    <section className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={validKey}
          onValueChange={(value: string) => router.push(buildUrl(value))}
        >
          <SelectTrigger className="w-auto min-w-52">
            <SelectValue placeholder="Wybierz miesiąc" />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => {
              const total = m.speechesCount + m.questionsCount
              return (
                <SelectItem key={toMonthKey(m.year, m.month)} value={toMonthKey(m.year, m.month)}>
                  {MONTHS_PL[m.month - 1]} {m.year}
                  {total > 0 && (
                    <span className="ml-1 text-gray-400">
                      ({m.speechesCount > 0 && `${m.speechesCount} przem.`}
                      {m.speechesCount > 0 && m.questionsCount > 0 && ' · '}
                      {m.questionsCount > 0 && `${m.questionsCount} pyt.`})
                    </span>
                  )}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          {prevMonth ? (
            <Link href={buildUrl(toMonthKey(prevMonth.year, prevMonth.month))} className={navLinkClass}>
              ← Poprzedni
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-md border border-input px-3 py-2 text-sm text-muted-foreground/40">
              ← Poprzedni
            </span>
          )}
          {nextMonth ? (
            <Link href={buildUrl(toMonthKey(nextMonth.year, nextMonth.month))} className={navLinkClass}>
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

export default ActivityMonthNav
