import { getMepBySlug, getMepVotes } from '@/lib/db/queries'
import { notFound } from 'next/navigation'
import { Container } from '@/components/Container'
import { StatsTable } from '@/components/StatsTable'
import { VoteCard } from '@/components/VoteCard'
import { CommitteeList } from '@/components/CommitteeList'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export type PageParams = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({
  params,
  searchParams,
}: PageParams): Promise<Metadata> {
  const { slug } = await params
  const mep = await getMepBySlug(slug)

  if (!mep) {
    return {
      title: 'Poseł nie znaleziony | Europosłowie.info',
    }
  }

  return {
    title: `${mep.fullName} - Profil posła | Europosłowie.info`,
    description: `Profil ${mep.fullName} (${
      mep.nationalParty || 'niezależny'
    }, ${
      mep.epGroup || 'brak grupy'
    }). Statystyki obecności, głosowania i aktywność w Parlamencie Europejskim.`,
  }
}

export default async function MEPProfilePage({
  params,
  searchParams,
}: PageParams) {
  const { slug } = await params
  const { page } = await searchParams
  const [mep, voteHistory] = await Promise.all([
    getMepBySlug(slug),
    getMepVotes(slug, {
      limit: 20,
      page: page ? parseInt(page as string, 10) : 1,
    }),
  ])

  if (!mep) {
    notFound()
  }

  const latestStats = mep.monthlyStats[0] || null

  return (
    <div className="py-8">
      <Container>
        <div className="mb-8">
          <div className="flex items-start gap-6">
            <div className="h-32 w-32 shrink-0 rounded-lg bg-gray-200">
              <div className="flex h-full items-center justify-center text-4xl font-bold text-gray-400">
                {mep.fullName.charAt(0)}
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {mep.fullName}
              </h1>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                {mep.nationalParty && (
                  <div>
                    <span className="font-medium">Partia krajowa:</span>{' '}
                    {mep.nationalParty}
                  </div>
                )}
                {mep.epGroup && (
                  <div>
                    <span className="font-medium">Grupa EP:</span> {mep.epGroup}
                  </div>
                )}
              </div>
              {latestStats && (
                <div className="mt-4 flex flex-wrap gap-6">
                  <div>
                    <div className="text-sm text-gray-600">Ranking</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {latestStats.rankingAmongPoles
                        ? `#${latestStats.rankingAmongPoles}`
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Obecność</div>
                    <div className="text-2xl font-bold text-green-600">
                      {latestStats.attendanceRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Głosowań</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {latestStats.totalVotes}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {mep.monthlyStats.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Statystyki miesięczne
            </h2>
            <StatsTable stats={mep.monthlyStats} />
          </section>
        )}
        {mep.topVotes.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Najważniejsze głosowania
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mep.topVotes.map((vote) => (
                <VoteCard key={vote.id} vote={vote} />
              ))}
            </div>
          </section>
        )}
        {voteHistory && voteHistory.votes.length > 0 && (
          <section className="mb-8">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Historia głosowań
              </h2>
              <span className="text-sm text-gray-500">
                {voteHistory.total} głosowań łącznie
              </span>
            </div>
            <div className="space-y-2">
              {voteHistory.votes.map((vote) => (
                <div
                  key={vote.id}
                  className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div
                    className={cn(
                      'w-24 shrink-0 rounded-full px-2 py-1 text-center text-xs font-semibold',
                      vote.voteChoice === 'FOR' &&
                        'bg-green-100 text-green-800',
                      vote.voteChoice === 'AGAINST' &&
                        'bg-red-100 text-red-800',
                      vote.voteChoice === 'ABSTAIN' &&
                        'bg-yellow-100 text-yellow-800',
                      vote.voteChoice === 'ABSENT' &&
                        'bg-gray-100 text-gray-600',
                    )}
                  >
                    {vote.voteChoice === 'FOR' && 'Za'}
                    {vote.voteChoice === 'AGAINST' && 'Przeciw'}
                    {vote.voteChoice === 'ABSTAIN' && 'Wstrzymał się'}
                    {vote.voteChoice === 'ABSENT' && 'Nieobecny'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {vote.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(vote.date).toLocaleDateString('pl-PL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  {vote.voteNumber && (
                    <a
                      href={`/glosowania/${vote.voteNumber}`}
                      className="shrink-0 text-xs text-blue-600 hover:underline"
                    >
                      Szczegóły →
                    </a>
                  )}
                </div>
              ))}
            </div>
            {voteHistory.hasMore && (
              <p className="mt-4 text-center text-sm text-gray-500">
                Wyświetlono 20 z {voteHistory.total} głosowań
              </p>
            )}
          </section>
        )}
        {mep.committees.length > 0 && (
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Komisje</h2>
            <CommitteeList committees={mep.committees} />
          </section>
        )}
        {mep.monthlyStats.length === 0 &&
          mep.topVotes.length === 0 &&
          mep.committees.length === 0 &&
          (!voteHistory || voteHistory.votes.length === 0) && (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-600">
                Brak danych statystycznych dla tego posła
              </p>
            </div>
          )}
      </Container>
    </div>
  )
}

export const revalidate = 86400 // 24 hours
