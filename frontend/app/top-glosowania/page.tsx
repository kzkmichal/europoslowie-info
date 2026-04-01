import { getCurrentMonthTopVotes } from '@/lib/db/queries'
import { Container } from '@/components/layout/Container'
import { VoteCard } from '@/components/votes/VoteCard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Top głosowania | Europosłowie.info',
  description:
    'Najważniejsze głosowania w Parlamencie Europejskim w bieżącym miesiącu. Zobacz głosowania o największym znaczeniu dla Polski.',
  keywords: [
    'głosowania PE',
    'parlament europejski',
    'ważne głosowania',
    'Polska',
    'głosowania europosłów',
  ],
}

export default async function TopVotesPage() {
  const votes = await getCurrentMonthTopVotes()

  const currentDate = new Date()
  const monthName = currentDate.toLocaleDateString('pl-PL', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="py-8">
      <Container>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Top głosowania</h1>
          <p className="mt-2 text-lg text-gray-600">
            Najważniejsze głosowania w miesiącu: {monthName}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Głosowania posortowane według ważności dla Polski
          </p>
        </div>
        {votes.length > 0 ? (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Znaleziono <span className="font-semibold">{votes.length}</span>{' '}
              {votes.length === 1
                ? 'głosowanie'
                : votes.length < 5
                ? 'głosowania'
                : 'głosowań'}
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {votes.map((vote, index) => (
                <div key={vote.id} className="relative">
                  {vote.starsPoland !== null && vote.starsPoland >= 4 && (
                    <div className="absolute -left-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-white shadow-lg">
                      {index + 1}
                    </div>
                  )}
                  <VoteCard vote={vote} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <div className="mx-auto mb-4 text-6xl">🗳️</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Brak głosowań w tym miesiącu
            </h3>
            <p className="text-gray-600">
              W bieżącym miesiącu nie odbyły się jeszcze żadne głosowania w
              Parlamencie Europejskim.
            </p>
          </div>
        )}
        {votes.length > 0 && (
          <div className="mt-8 rounded-lg bg-blue-50 p-6">
            <h3 className="mb-2 text-sm font-semibold text-blue-900">
              Jak oceniamy ważność głosowań?
            </h3>
            <p className="text-sm text-blue-800">
              Głosowania są oceniane pod kątem ich znaczenia dla Polski w skali
              od 1 do 5 gwiazdek. Ocena uwzględnia potencjalny wpływ na polską
              gospodarkę, społeczeństwo i politykę krajową.
            </p>
          </div>
        )}
      </Container>
    </div>
  )
}

export const revalidate = 3600
