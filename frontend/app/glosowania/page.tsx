import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { VoteCard } from '@/components/votes/VoteCard'
import { VotesFilter } from '@/components/votes/VotesFilter'
import { getVotesList, getTopicCategories } from '@/lib/db/queries'
import type { Metadata } from 'next'
import { Fragment } from 'react'

export type PageProps = {
  searchParams?: Promise<{
    page: string
    year: string
    month: string
    result: string
    search: string
    topic: string
  }>
}

export const metadata: Metadata = {
  title: 'Głosowania posłów w Parlamencie Europejskim | Europosłowie.info',
  description:
    'Sprawdź, jak głosowali polscy posłowie w Parlamencie Europejskim. Znajdziesz tu szczegółowe informacje o ich decyzjach podczas głosowań, a także statystyki dotyczące ich aktywności i obecności.',
}

export default async function GlosowaniaPage({ searchParams }: PageProps) {
  const params = await searchParams

  const page = Math.max(1, Number(params?.page) || 1)
  const year = params?.year ? Number(params?.year) : undefined
  const month = year && params?.month ? Number(params?.month) : undefined
  const search = params?.search ? String(params?.search) : undefined
  const topic = params?.topic ? String(params?.topic) : undefined
  const result =
    params?.result === 'ADOPTED' || params?.result === 'REJECTED'
      ? params?.result
      : undefined

  const [{ votes, hasMore }, topics] = await Promise.all([
    getVotesList({ limit: 20, page, year, month, result, search, topic }),
    getTopicCategories(),
  ])

  const votesByDate = votes.reduce(
    (acc, vote) => {
      const dateKey = new Date(vote.date).toISOString().split('T')[0]
      if (!acc[dateKey]) acc[dateKey] = []
      acc[dateKey].push(vote)
      return acc
    },
    {} as Record<string, typeof votes>,
  )

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const paramObject = {
      page: String(page),
      year: year ? String(year) : undefined,
      month: month ? String(month) : undefined,
      result: result || undefined,
      search: search || undefined,
      topic: topic || undefined,
      ...overrides,
    }
    const urlParams = new URLSearchParams(
      Object.entries(paramObject)
        .filter(([, value]) => value !== undefined)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
    )
    return `/glosowania?${urlParams.toString()}`
  }

  const navItemClass =
    'flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors'

  return (
    <div className="py-8">
      <Container>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-on-surface">
            Głosowania
          </h1>
          <p className="mt-2 text-on-surface-variant">
            Kompletne archiwum procesów decyzyjnych Parlamentu Europejskiego.
            Monitoruj historyczne oraz bieżące wyniki głosowań nad kluczowymi
            aktami prawnymi kształtującymi przyszłość wspólnoty.
          </p>
        </div>
        <VotesFilter
          year={year}
          month={month}
          result={result}
          search={search}
          topic={topic}
          topics={topics}
        />
        {votes.length === 0 ? (
          <p className="text-outline">Brak głosowań do wyświetlenia.</p>
        ) : (
          <div className="flex flex-col">
            <div className="grid gap-4 lg:grid-cols-2">
              {Object.entries(votesByDate).map(([date, dateVotes]) => (
                <Fragment key={date}>
                  <h2 className="font-display col-span-full text-xl font-semibold text-on-surface">
                    {new Date(date + 'T12:00:00').toLocaleDateString('pl-PL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h2>
                  {dateVotes.map((vote) => (
                    <VoteCard key={vote.id} vote={vote} />
                  ))}
                </Fragment>
              ))}
            </div>
            {(page > 1 || hasMore) && (
              <nav className="mt-10 flex items-center justify-center gap-2">
                {page > 1 ? (
                  <Link
                    href={buildUrl({ page: String(page - 1) })}
                    className={`${navItemClass} text-on-surface-variant hover:bg-surface-container-low`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Poprzednia
                  </Link>
                ) : (
                  <span
                    className={`${navItemClass} cursor-not-allowed text-outline/40`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Poprzednia
                  </span>
                )}
                <span className="px-3 text-sm text-on-surface-variant">
                  Strona {page}
                </span>
                {hasMore ? (
                  <Link
                    href={buildUrl({ page: String(page + 1) })}
                    className={`${navItemClass} text-on-surface-variant hover:bg-surface-container-low`}
                  >
                    Następna
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span
                    className={`${navItemClass} cursor-not-allowed text-outline/40`}
                  >
                    Następna
                    <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </nav>
            )}
          </div>
        )}
      </Container>
    </div>
  )
}

export const dynamic = 'force-dynamic'
