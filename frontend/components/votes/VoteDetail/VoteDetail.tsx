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
import { RelatedVoteNotice } from './components/RelatedVoteNotice'

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
    isRepresentative,
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

  const isSubVote = !isRepresentative && relatedVotes.length > 0
  const mainVote = relatedVotes.find((v) => v.isRepresentative)

  const parsedDescription = voteDescription
    ? (() => {
        try {
          return JSON.parse(voteDescription)
        } catch {
          return null
        }
      })()
    : null

  const contextText = parsedDescription?.description ?? contextAi
  const hasContext = !!contextText && !isSubVote
  const hasSources = voteSources.length > 0

  return (
    <div className="space-y-8">
      <VoteHero
        title={title}
        date={date}
        result={result}
        decLabel={decLabel}
        isMain={isMain ?? false}
        isSubVote={isSubVote}
        votesFor={votesFor}
        votesAgainst={votesAgainst}
        epDocInfo={epDocInfo}
      />

      {(isSubVote || hasContext) && hasSources ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            {isSubVote ? (
              <RelatedVoteNotice
                decLabel={decLabel}
                mainVote={mainVote ?? null}
              />
            ) : (
              <VoteContextPanel
                contextAi={contextText!}
                bullets={parsedDescription?.bullets ?? null}
                isAiGenerated={!!parsedDescription}
                sourceUrl={parsedDescription?.source_url ?? null}
                topicCategory={topicCategory}
                starsPoland={starsPoland}
              />
            )}
          </div>
          <div className="lg:col-span-2">
            <VoteSourcesPanel sources={voteSources} />
          </div>
        </div>
      ) : (
        <>
          {isSubVote && (
            <RelatedVoteNotice
              decLabel={decLabel}
              mainVote={mainVote ?? null}
            />
          )}
          {hasContext && (
            <VoteContextPanel
              contextAi={contextText!}
              bullets={parsedDescription?.bullets ?? null}
              isAiGenerated={!!parsedDescription}
              sourceUrl={parsedDescription?.source_url ?? null}
              topicCategory={topicCategory}
              starsPoland={starsPoland}
            />
          )}
        </>
      )}

      <PolishMEPsSection
        polishVotes={polishVotes}
        summary={summary}
        epGroupRows={epGroupRows}
      />

      {(votesFor != null ||
        votesAgainst != null ||
        votesAbstain != null ||
        (!isSubVote && relatedVotes.length > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {(votesFor != null ||
            votesAgainst != null ||
            votesAbstain != null) && (
            <GlobalResultsPanel
              votesFor={votesFor}
              votesAgainst={votesAgainst}
              votesAbstain={votesAbstain}
            />
          )}
          {!isSubVote && relatedVotes.length > 0 && (
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
