'use client'

import { BaseProps, MEPSessionSummary } from '@/lib/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

export type VoteSessionNavProps = BaseProps & {
  sessions: MEPSessionSummary[]
  currentSessionId?: number
  slug: string
}

const VoteSessionNav = ({
  sessions,
  currentSessionId,
  slug,
}: VoteSessionNavProps) => {
  const router = useRouter()

  const currentSession =
    sessions.find((s) => s.id === currentSessionId) || sessions[0]

  if (!currentSession) {
    return null
  }

  const { location, startDate, endDate, votesFor, votesAgainst, votesAbstain } =
    currentSession

  const formatDateRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
    const startStr = start.toLocaleDateString('pl-PL', options)
    const endStr = end.toLocaleDateString('pl-PL', options)
    return startStr === endStr ? startStr : `${startStr} – ${endStr}`
  }

  const currentIndex = currentSession.id
  const prevSession = sessions[currentIndex - 1]
  const nextSession = sessions[currentIndex + 1]

  const navLinkClass =
    'rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-2xl font-bold text-gray-900">
        Historia głosowań
      </h2>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={`${currentSession.id}`}
          onValueChange={(value) =>
            router.push(`/poslowie/${slug}?session=${value}`)
          }
        >
          <SelectTrigger className="w-auto min-w-[240px]">
            <SelectValue placeholder="Wybierz sesję" />
          </SelectTrigger>
          <SelectContent>
            {sessions.map((session) => (
              <SelectItem key={session.id} value={session.id.toString()}>
                {session.location} ·{' '}
                {formatDateRange(session.startDate, session.endDate)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          {prevSession ? (
            <Link
              href={`/poslowie/${slug}?session=${prevSession.id}`}
              title="poprzednia sesja"
              className={navLinkClass}
            >
              ← Poprzednia
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-md border border-input px-3 py-2 text-sm text-muted-foreground/40">
              ← Poprzednia
            </span>
          )}
          {nextSession ? (
            <Link
              href={`/poslowie/${slug}?session=${nextSession.id}`}
              title="następna sesja"
              className={navLinkClass}
            >
              Następna →
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-md border border-input px-3 py-2 text-sm text-muted-foreground/40">
              Następna →
            </span>
          )}
        </div>
      </div>

      {/* Session info bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <span className="text-sm font-medium text-gray-700">
          Sesja plenarna · {location} · {formatDateRange(startDate, endDate)}
        </span>
        <span className="text-sm text-gray-500">
          <span className="font-medium text-green-600">{votesFor} za</span>
          {' · '}
          <span className="font-medium text-red-600">
            {votesAgainst} przeciw
          </span>
          {' · '}
          <span className="font-medium text-yellow-600">
            {votesAbstain} wstrz.
          </span>
        </span>
      </div>
    </section>
  )
}

export default VoteSessionNav
