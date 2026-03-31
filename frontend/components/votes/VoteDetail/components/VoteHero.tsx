import Link from 'next/link'
import { CheckCircle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type VoteHeroProps = {
  title: string
  date: Date | null
  result: string | null
  decLabel: string | null
  isMain: boolean
  votesFor: number | null
  votesAgainst: number | null
  epDocInfo: { url: string; displayRef: string } | null
}

export const VoteHero = ({
  title,
  date,
  result,
  decLabel,
  isMain,
  votesFor,
  votesAgainst,
  epDocInfo,
}: VoteHeroProps) => {
  const isAdopted = result === 'ADOPTED'
  const isRejected = result === 'REJECTED'

  return (
    <section>
      <Link
        href="/glosowania"
        className="mb-6 flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors"
      >
        ← Powrót do listy głosowań
      </Link>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {epDocInfo && (
          <Link
            href={epDocInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-80 transition-opacity"
          >
            {epDocInfo.displayRef}
          </Link>
        )}
        {date && (
          <span className="text-on-surface-variant text-sm font-medium">
            {new Date(date).toLocaleDateString('pl-PL', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        )}
      </div>
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-black font-display text-primary leading-tight tracking-tight">
            {title}
          </h1>
          {!isMain && decLabel && (
            <p className="mt-3 text-base text-on-surface-variant">{decLabel}</p>
          )}
        </div>
        <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
          {(isAdopted || isRejected) && (
            <Badge
              variant={isAdopted ? 'adopted' : 'rejected'}
              className="px-5 py-2.5 text-base font-black uppercase tracking-wider rounded-xl gap-2"
            >
              {isAdopted ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {isAdopted ? 'Przyjęto' : 'Odrzucono'}
            </Badge>
          )}
          {(votesFor != null || votesAgainst != null) && (
            <div className="text-on-surface-variant text-sm font-semibold lg:text-right">
              Wynik ogólny PE:{' '}
              <span className="text-primary">{votesFor ?? 0} Za</span>
              {' / '}
              <span className="text-error">{votesAgainst ?? 0} Przeciw</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
