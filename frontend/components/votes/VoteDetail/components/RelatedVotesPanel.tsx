'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { RelatedVote } from '@/lib/types'
import { RelatedVotesDialog } from './RelatedVotesDialog'

const PREVIEW_COUNT = 2

type RelatedVotesPanelProps = {
  votes: RelatedVote[]
  currentVoteNumber: string
}

const VoteItem = ({
  vote,
  isCurrent,
}: {
  vote: RelatedVote
  isCurrent: boolean
}) => {
  const isAdopted = vote.result === 'ADOPTED'
  const isRejected = vote.result === 'REJECTED'

  const inner = (
    <>
      <div
        className={cn(
          'text-xs font-bold uppercase mb-1 flex items-center gap-2',
          isCurrent ? 'text-primary' : 'text-on-surface-variant',
        )}
      >
        {vote.voteNumber}
        {isCurrent && (
          <span className="bg-primary text-white px-1.5 py-0.5 rounded text-[9px]">
            BIEŻĄCE
          </span>
        )}
      </div>
      <div className="flex justify-between items-center gap-2">
        <span
          className={cn(
            'text-sm',
            isCurrent
              ? 'font-bold text-primary'
              : 'font-medium text-on-surface',
          )}
        >
          {vote.decLabel || vote.voteNumber}
        </span>
        {vote.result && (
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0',
              isAdopted && 'bg-primary-fixed text-on-primary-fixed',
              isRejected && 'bg-error-container text-on-error-container',
            )}
          >
            {isAdopted ? 'Przyjęto' : isRejected ? 'Odrzucono' : vote.result}
          </span>
        )}
      </div>
    </>
  )

  return isCurrent ? (
    <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 shadow-sm ring-1 ring-primary/5">
      {inner}
    </div>
  ) : (
    <Link
      href={`/glosowania/${vote.voteNumber}`}
      className="block bg-surface-container-low p-3 rounded-xl border border-outline-variant/30 hover:border-primary/20 transition-all"
    >
      {inner}
    </Link>
  )
}

export const RelatedVotesPanel = ({
  votes,
  currentVoteNumber,
}: RelatedVotesPanelProps) => {
  if (votes.length === 0) return null

  const preview = votes.slice(0, PREVIEW_COUNT)
  const hasMore = votes.length > PREVIEW_COUNT

  return (
    <section className="bg-white rounded-3xl p-6 border border-outline-variant/20 shadow-sm flex flex-col">
      <h2 className="font-display font-bold text-xl text-primary mb-1">
        Powiązane głosowania
      </h2>
      <p className="text-xs text-on-surface-variant mb-4">
        Głosowania nad poprawkami i częściami składowymi tego samego aktu.
      </p>
      <div className="space-y-2">
        {preview.map((vote) => (
          <VoteItem
            key={vote.voteNumber}
            vote={vote}
            isCurrent={vote.voteNumber === currentVoteNumber}
          />
        ))}
      </div>
      {hasMore && (
        <RelatedVotesDialog>
          <RelatedVotesDialog.Trigger>
            <button className="mt-4 w-full text-xs font-bold text-primary hover:underline text-center">
              Zobacz wszystkie ({votes.length})
            </button>
          </RelatedVotesDialog.Trigger>
          <RelatedVotesDialog.Content
            title={`Powiązane głosowania (${votes.length})`}
          >
            {votes.map((vote) => (
              <VoteItem
                key={vote.voteNumber}
                vote={vote}
                isCurrent={vote.voteNumber === currentVoteNumber}
              />
            ))}
          </RelatedVotesDialog.Content>
        </RelatedVotesDialog>
      )}
    </section>
  )
}
