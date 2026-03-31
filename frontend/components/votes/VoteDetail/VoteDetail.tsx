import { cn } from '@/lib/utils'
import type {
  VoteDetailsById,
  EpGroupRow,
  RelatedVote,
  VoteSource,
} from '@/lib/types'
import { VoteHero } from './components/VoteHero'
import { VoteContextPanel } from './components/VoteContextPanel'
import { VoteSourcesPanel } from './components/VoteSourcesPanel'
import { PolishMEPsSection } from './components/PolishMEPsSection'
import { GlobalResultsPanel } from './components/GlobalResultsPanel'
import { RelatedVotesPanel } from './components/RelatedVotesPanel'

type VoteDetailProps = {
  voteDetails: VoteDetailsById
  epGroupRows: EpGroupRow[]
  relatedVotes: RelatedVote[]
  voteSources: VoteSource[]
  epDocInfo: { url: string; displayRef: string } | null
  voteNumber: string
}

export const VoteDetail = ({
  voteDetails,
  epGroupRows,
  relatedVotes,
  voteSources,
  epDocInfo,
  voteNumber,
}: VoteDetailProps) => {
  const {
    title,
    date,
    result,
    decLabel,
    isMain,
    votesFor,
    votesAgainst,
    votesAbstain,
    contextAi,
    voteDescription,
    topicCategory,
    starsPoland,
    polishVotes,
    summary,
  } = voteDetails

  const parsedDescription = voteDescription ? (() => {
    try { return JSON.parse(voteDescription) } catch { return null }
  })() : null

  const contextText = parsedDescription?.description ?? contextAi
  const hasContext = !!contextText
  const hasSources = voteSources.length > 0

  return (
    <div className="space-y-8">
      <VoteHero
        title={title}
        date={date}
        result={result}
        decLabel={decLabel}
        isMain={isMain ?? false}
        votesFor={votesFor}
        votesAgainst={votesAgainst}
        epDocInfo={epDocInfo}
      />

      {(hasContext || hasSources) && (
        <div
          className={cn(
            'grid grid-cols-1 gap-8',
            hasContext && hasSources && 'lg:grid-cols-5',
          )}
        >
          {hasContext && (
            <div className={cn(hasSources && 'lg:col-span-3')}>
              <VoteContextPanel
                contextAi={contextText!}
                bullets={parsedDescription?.bullets ?? null}
                isAiGenerated={!!parsedDescription}
                sourceUrl={parsedDescription?.source_url ?? null}
                topicCategory={topicCategory}
                starsPoland={starsPoland}
              />
            </div>
          )}
          {hasSources && (
            <div className={cn(hasContext && 'lg:col-span-2')}>
              <VoteSourcesPanel sources={voteSources} />
            </div>
          )}
        </div>
      )}

      <PolishMEPsSection
        polishVotes={polishVotes}
        summary={summary}
        epGroupRows={epGroupRows}
      />

      {((votesFor != null || votesAgainst != null || votesAbstain != null) ||
        relatedVotes.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {(votesFor != null || votesAgainst != null || votesAbstain != null) && (
            <GlobalResultsPanel
              votesFor={votesFor}
              votesAgainst={votesAgainst}
              votesAbstain={votesAbstain}
            />
          )}
          {relatedVotes.length > 0 && (
            <RelatedVotesPanel
              votes={relatedVotes}
              currentVoteNumber={voteNumber}
            />
          )}
        </div>
      )}
    </div>
  )
}
