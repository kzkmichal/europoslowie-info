import {
  getVoteDetails,
  getRelatedVotes,
  getEpGroupBreakdown,
  getVoteSources,
} from '@/lib/db/queries'
import { notFound } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { VoteDetail } from '@/components/votes/VoteDetail/VoteDetail'
import type { Metadata } from 'next'

function humanRefToUrlRef(humanRef: string): string | null {
  const m = humanRef.match(/^([A-Z]+)(\d+)-(\d+)\/(\d{4})$/)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[4]}-${m[3]}`
}

function urlRefToHumanRef(urlRef: string): string {
  const m = urlRef.match(/^([A-Z]+)-(\d+)-(\d{4})-(\d+)$/)
  if (!m) return urlRef
  return `${m[1]}${m[2]}-${m[4]}/${m[3]}`
}

function buildEpDocInfo(
  documentReference: string | null,
  decLabel: string | null,
): { url: string; displayRef: string } | null {
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
  const [voteDetails, relatedVotes, epGroupRows, voteSources] =
    await Promise.all([
      getVoteDetails(voteNumber),
      getRelatedVotes(voteNumber),
      getEpGroupBreakdown(voteNumber),
      getVoteSources(voteNumber),
    ])

  if (!voteDetails) {
    notFound()
  }

  const epDocInfo = buildEpDocInfo(
    voteDetails.documentReference,
    voteDetails.decLabel,
  )

  return (
    <div className="py-8">
      <Container>
        <VoteDetail
          voteDetails={voteDetails}
          epGroupRows={epGroupRows}
          relatedVotes={relatedVotes}
          voteSources={voteSources}
          epDocInfo={epDocInfo}
          voteNumber={voteNumber}
        />
      </Container>
    </div>
  )
}

export const revalidate = 86400
