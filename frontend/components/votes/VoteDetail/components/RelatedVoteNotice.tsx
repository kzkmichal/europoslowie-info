import Link from 'next/link'
import type { RelatedVote } from '@/lib/types'

type RelatedVoteNoticeProps = {
  decLabel: string | null
  mainVote: RelatedVote | null
}

export const RelatedVoteNotice = ({
  decLabel,
  mainVote,
}: RelatedVoteNoticeProps) => {
  const subVoteType = decLabel
    ? decLabel.replace(/^[A-Z0-9\-/]+\s*-\s*/, '').trim()
    : null

  return (
    <section className="bg-secondary-container/20 border border-secondary-container/40 rounded-2xl p-8 shadow-sm w-full h-full">
      <div className="flex items-start flex-col gap-3">
        <p className="font-display font-bold text-xl text-primary">
          To jest głosowanie powiązane
          {subVoteType && (
            <span className="font-normal text-on-surface-variant">
              {' '}
              — {subVoteType}
            </span>
          )}
        </p>
        <p className="text-base text-on-surface/90 leading-relaxed">
          Jest częścią składową szerszego głosowania nad tym samym aktem
          legislacyjnym. Opis merytoryczny i kontekst są dostępne przy
          głosowaniu głównym.
        </p>
        {mainVote && (
          <Link
            href={`/glosowania/${mainVote.voteNumber}`}
            className="mt-1 inline-flex items-center gap-2 text-base font-bold text-primary hover:underline"
          >
            Zobacz głosowanie główne →
          </Link>
        )}
      </div>
    </section>
  )
}
