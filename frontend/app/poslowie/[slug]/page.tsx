import {
  getMepBySlug,
  getMepSessionList,
  getMepVotesBySession,
} from '@/lib/db/queries'
import { notFound } from 'next/navigation'
import { Container } from '@/components/Container'
import { StatsTable } from '@/components/StatsTable'
import { VoteCard } from '@/components/VoteCard'
import { CommitteeList } from '@/components/CommitteeList'
import type { Metadata } from 'next'
import VoteSessionNav from '@/components/VoteSessionNav'
import { VoteRow } from '@/components/VoteRow'

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
  const { session } = await searchParams
  const sessionId = session ? parseInt(session as string, 10) : undefined

  const [mep, sessionList] = await Promise.all([
    getMepBySlug(slug),
    getMepSessionList(slug),
  ])

  if (!mep) {
    notFound()
  }

  const currentSessionId = sessionId ?? sessionList[0]?.id
  const votes = currentSessionId
    ? await getMepVotesBySession(slug, currentSessionId)
    : []

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
        <VoteSessionNav
          sessions={sessionList}
          slug={slug}
          currentSessionId={currentSessionId}
        />
        {votes && votes.length > 0 && (
          <section className="mb-8">
            <div className="space-y-2">
              {votes.map((vote) => (
                <VoteRow key={vote.id} vote={vote} />
              ))}
            </div>
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
          (!votes || votes.length === 0) && (
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
