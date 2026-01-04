import { getVoteById } from '@/lib/db/queries'
import { notFound } from 'next/navigation'
import { Container } from '@/components/Container'
import { VotingBreakdown } from '@/components/VotingBreakdown'
import { MEPVoteList } from '@/components/MEPVoteList'
import type { Metadata } from 'next'
import { cn } from '@/lib/utils'

export type PageParams = { params: Promise<{ id: string }> }

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { id } = await params
  const voteId = parseInt(id, 10)

  if (isNaN(voteId)) {
    return {
      title: 'Głosowanie nie znalezione | Europosłowie.info',
    }
  }

  const voteDetails = await getVoteById(voteId)

  if (!voteDetails) {
    return {
      title: 'Głosowanie nie znalezione | Europosłowie.info',
    }
  }

  return {
    title: `${voteDetails.vote.title} - Głosowanie | Europosłowie.info`,
    description: `Szczegóły głosowania w Parlamencie Europejskim. Zobacz jak głosowali polscy posłowie: ${voteDetails.summary.for} ZA, ${voteDetails.summary.against} PRZECIW, ${voteDetails.summary.abstain} WSTRZYMAŁO SIĘ.`,
  }
}

export default async function VoteDetailsPage({ params }: PageParams) {
  const { id } = await params
  const voteId = parseInt(id, 10)

  if (isNaN(voteId)) {
    notFound()
  }

  const voteDetails = await getVoteById(voteId)

  if (!voteDetails) {
    notFound()
  }

  const { vote, session, polishVotes, summary } = voteDetails

  return (
    <div className="py-8">
      <Container>
        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{vote.title}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
              {vote.date && (
                <div>
                  <span className="font-medium">Data:</span>{' '}
                  {new Date(vote.date).toLocaleDateString('pl-PL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              )}
              {session.sessionNumber && (
                <div>
                  <span className="font-medium">Sesja:</span>{' '}
                  {session.sessionNumber}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {vote.result && (
              <div
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold',
                  vote.result === 'ADOPTED' && 'bg-green-100 text-green-800',
                  vote.result === 'REJECTED' && 'bg-red-100 text-red-800'
                )}
              >
                {vote.result === 'ADOPTED' ? 'Przyjęto' : 'Odrzucono'}
              </div>
            )}
            {vote.starsPoland !== null && (
              <div className="flex items-center gap-2 rounded-full bg-yellow-50 px-4 py-2">
                <span className="text-sm font-medium text-gray-700">
                  Ważność dla Polski:
                </span>
                <span className="text-lg font-bold text-yellow-600">
                  {vote.starsPoland}⭐
                </span>
              </div>
            )}
          </div>
          {vote.contextAi && (
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-700">{vote.contextAi}</p>
            </div>
          )}
        </div>
        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            Wyniki głosowania polskich posłów
          </h2>
          <VotingBreakdown summary={summary} />
        </section>
        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            Jak głosowali polscy posłowie
          </h2>
          <div className="space-y-6">
            {polishVotes.FOR.length > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-green-700">
                  Za ({polishVotes.FOR.length})
                </h3>
                <MEPVoteList votes={polishVotes.FOR} variant="for" />
              </div>
            )}
            {polishVotes.AGAINST.length > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-red-700">
                  Przeciw ({polishVotes.AGAINST.length})
                </h3>
                <MEPVoteList votes={polishVotes.AGAINST} variant="against" />
              </div>
            )}
            {polishVotes.ABSTAIN.length > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-yellow-700">
                  Wstrzymało się ({polishVotes.ABSTAIN.length})
                </h3>
                <MEPVoteList votes={polishVotes.ABSTAIN} variant="abstain" />
              </div>
            )}
            {polishVotes.ABSENT.length > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-700">
                  Nieobecni ({polishVotes.ABSENT.length})
                </h3>
                <MEPVoteList votes={polishVotes.ABSENT} variant="absent" />
              </div>
            )}
          </div>
        </section>
      </Container>
    </div>
  )
}

export const revalidate = 86400
