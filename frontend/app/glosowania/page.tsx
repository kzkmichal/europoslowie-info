import { Container } from '@/components/Container'
import { VoteCard } from '@/components/VoteCard'
import { getVotesList } from '@/lib/db/queries'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Głosowania posłów w Parlamencie Europejskim | Europosłowie.info',
  description:
    'Sprawdź, jak głosowali polscy posłowie w Parlamencie Europejskim. Znajdziesz tu szczegółowe informacje o ich decyzjach podczas głosowań, a także statystyki dotyczące ich aktywności i obecności.',
}

export default async function GlosowaniaPage() {
  const { votes, total } = await getVotesList({ limit: 50 })

  return (
    <div className="py-8">
      <Container>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Głosowania</h1>
          <p className="mt-2 text-gray-600">
            {total} głosowań z udziałem polskich europosłów
          </p>
        </div>

        {votes.length === 0 ? (
          <p className="text-gray-500">Brak głosowań do wyświetlenia.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {votes.map((vote) => (
              <VoteCard key={vote.id} vote={vote} />
            ))}
          </div>
        )}
      </Container>
    </div>
  )
}

export const revalidate = 86400
