import {
  getVoteDetails,
  getRelatedVotes,
  getEpGroupBreakdown,
  getVoteSources,
} from '@/lib/db/queries'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/Container'
import { VotingBreakdown } from '@/components/VotingBreakdown'
import { AllMEPsVotingChart } from '@/components/AllMEPsVotingChart'
import { EpGroupBreakdown } from '@/components/EpGroupBreakdown'
import { RelatedVotesList } from '@/components/RelatedVotesList'
import { MEPVoteList } from '@/components/MEPVoteList'
import { VoteSources } from '@/components/VoteSources'
import type { Metadata } from 'next'
import { cn } from '@/lib/utils'

/**
 * Convert human-readable EP doc ref to the API/URL format.
 * "B10-0557/2025" → "B-10-2025-0557"
 */
function humanRefToUrlRef(humanRef: string): string | null {
  // e.g. "B10-0557/2025" or "A10-0244/2025"
  const m = humanRef.match(/^([A-Z]+)(\d+)-(\d+)\/(\d{4})$/)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[4]}-${m[3]}`
}

/**
 * Convert DB/URL format to human-readable EP doc ref.
 * "B-10-2025-0557" → "B10-0557/2025"
 */
function urlRefToHumanRef(urlRef: string): string {
  const m = urlRef.match(/^([A-Z]+)-(\d+)-(\d{4})-(\d+)$/)
  if (!m) return urlRef
  return `${m[1]}${m[2]}-${m[4]}/${m[3]}`
}

/**
 * Build a direct link to the official EP document page.
 * Prefers the reference embedded in decLabel (more specific than VOT-ITM level
 * document_reference which can be shared across related votes).
 *
 * dec_label "B10-0557/2025 - Projekt rezolucji..." → B-10-2025-0557
 * document_reference "B-10-2025-0558" is used only as fallback
 */
function buildEpDocInfo(
  documentReference: string | null,
  decLabel: string | null,
): { url: string; displayRef: string } | null {
  // 1. Try to extract from dec_label first (vote-specific, avoids VOT-ITM mismatch)
  if (decLabel) {
    const m = decLabel.match(/^([A-Z]+\d+-\d+\/\d{4})\s*-/)
    if (m) {
      const urlRef = humanRefToUrlRef(m[1])
      if (urlRef) {
        return {
          url: `https://www.europarl.europa.eu/doceo/document/${urlRef}_PL.html`,
          displayRef: m[1],
        }
      }
    }
  }
  // 2. Fall back to document_reference from DB
  if (!documentReference) return null
  return {
    url: `https://www.europarl.europa.eu/doceo/document/${documentReference}_PL.html`,
    displayRef: urlRefToHumanRef(documentReference),
  }
}

export type PageParams = { params: Promise<{ voteNumber: string }> }

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { voteNumber } = await params
  const voteDetails = await getVoteDetails(voteNumber)

  if (!voteDetails) {
    return {
      title: 'Głosowanie nie znalezione | Europosłowie.info',
    }
  }

  return {
    title: `${voteDetails.title} - Głosowanie | Europosłowie.info`,
    description: `Szczegóły głosowania w Parlamencie Europejskim. Zobacz jak głosowali polscy posłowie: ${voteDetails.summary.for} ZA, ${voteDetails.summary.against} PRZECIW, ${voteDetails.summary.abstain} WSTRZYMAŁO SIĘ.`,
  }
}

export default async function VoteDetailsPage({ params }: PageParams) {
  const { voteNumber } = await params
  const [voteDetails, relatedVotes, epGroupRows, voteSources] = await Promise.all([
    getVoteDetails(voteNumber),
    getRelatedVotes(voteNumber),
    getEpGroupBreakdown(voteNumber),
    getVoteSources(voteNumber),
  ])

  if (!voteDetails) {
    notFound()
  }

  const {
    title,
    session,
    polishVotes,
    summary,
    result,
    date,
    starsPoland,
    contextAi,
    votesFor,
    votesAgainst,
    votesAbstain,
    decLabel,
    isMain,
    documentReference,
  } = voteDetails
  const epDocInfo = buildEpDocInfo(documentReference, decLabel)

  return (
    <div className="py-8">
      <Container>
        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            {/* dec_label subtitle — only for sub-votes (is_main = false) */}
            {!isMain && decLabel && (
              <p className="mt-1 text-base text-gray-500">
                Głosowanie nad:{' '}
                <span className="font-medium text-gray-700">{decLabel}</span>
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
              {date && (
                <div>
                  <span className="font-medium">Data:</span>{' '}
                  {new Date(date).toLocaleDateString('pl-PL', {
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
              {epDocInfo && (
                <div>
                  <span className="font-medium">Dokument:</span>{' '}
                  <Link
                    href={epDocInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {epDocInfo.displayRef} ↗
                  </Link>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {result && (
              <div
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold',
                  result === 'ADOPTED' && 'bg-green-100 text-green-800',
                  result === 'REJECTED' && 'bg-red-100 text-red-800',
                )}
              >
                {result === 'ADOPTED' ? 'Przyjęto' : 'Odrzucono'}
              </div>
            )}
            {starsPoland !== null && (
              <div className="flex items-center gap-2 rounded-full bg-yellow-50 px-4 py-2">
                <span className="text-sm font-medium text-gray-700">
                  Ważność dla Polski:
                </span>
                <span className="text-lg font-bold text-yellow-600">
                  {starsPoland}⭐
                </span>
              </div>
            )}
          </div>
          {contextAi && (
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-700">{contextAi}</p>
            </div>
          )}
        </div>
        <VoteSources sources={voteSources} />
        {relatedVotes.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Powiązane głosowania
            </h2>
            <RelatedVotesList
              votes={relatedVotes}
              currentVoteNumber={voteNumber}
            />
          </section>
        )}
        {(votesFor != null || votesAgainst != null || votesAbstain != null) && (
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Wyniki głosowania wszystkich europosłów
            </h2>
            <AllMEPsVotingChart
              votesFor={votesFor}
              votesAgainst={votesAgainst}
              votesAbstain={votesAbstain}
            />
          </section>
        )}
        {epGroupRows.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Polscy posłowie według grupy politycznej
            </h2>
            <EpGroupBreakdown rows={epGroupRows} />
          </section>
        )}
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
