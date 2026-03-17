import { Container } from '@/components/layout/Container'
import { VoteCard } from '@/components/votes/VoteCard'
import { VotesFilter } from '@/components/votes/VotesFilter'
import { getVotesList } from '@/lib/db/queries'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Fragment } from 'react'

export type PageProps = {
  searchParams?: Promise<{
    page: string
    year: string
    month: string
    result: string
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
  const result =
    params?.result === 'ADOPTED' || params?.result === 'REJECTED'
      ? params?.result
      : undefined

  const { votes, total, hasMore } = await getVotesList({
    limit: 50,
    page,
    year,
    month,
    result,
  })

  const votesByDate = votes.reduce(
    (acc, vote) => {
      const dateKey = vote.date.toISOString().split('T')[0]
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
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
      ...overrides,
    }
    const params = new URLSearchParams(
      Object.entries(paramObject)
        .filter(([, value]) => value !== undefined)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
    )
    return `/glosowania?${params.toString()}`
  }

  return (
    <div className="py-8">
      <Container>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Głosowania</h1>
          <p className="mt-2 text-gray-600">
            {total} głosowań z udziałem polskich europosłów
          </p>
        </div>
        <VotesFilter year={year} month={month} result={result} />
        {votes.length === 0 ? (
          <p className="text-gray-500">Brak głosowań do wyświetlenia.</p>
        ) : (
          <div className=" flex flex-col">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {votesByDate &&
                Object.entries(votesByDate).map(([date, votes]) => (
                  <Fragment key={date}>
                    <h2 className="col-span-full text-xl font-semibold text-gray-800">
                      {new Date(date + 'T12:00:00').toLocaleDateString(
                        'pl-PL',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        },
                      )}
                    </h2>
                    {votes.map((vote) => (
                      <VoteCard key={vote.id} vote={vote} />
                    ))}
                  </Fragment>
                ))}
            </div>
            <div>
              {page > 1 && (
                <Link href={buildUrl({ page: String(page - 1) })}>
                  Poprzednia
                </Link>
              )}
              <span>
                Strona {page} z {Math.ceil(total / 50)}
              </span>
              {hasMore && (
                <Link href={buildUrl({ page: String(page + 1) })}>
                  Następna
                </Link>
              )}
            </div>
          </div>
        )}
      </Container>
    </div>
  )
}

export const revalidate = 86400
