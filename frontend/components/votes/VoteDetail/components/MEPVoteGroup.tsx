import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { VoteWithMEP } from '@/lib/types'

type MEPVoteGroupProps = {
  votes: VoteWithMEP[]
  variant: 'FOR' | 'AGAINST' | 'ABSTAIN' | 'ABSENT'
}

const VARIANT_CONFIG = {
  FOR: {
    label: 'Za',
    lineColor: 'bg-primary-container/20',
    textColor: 'text-primary-container',
  },
  AGAINST: {
    label: 'Przeciw',
    lineColor: 'bg-error/10',
    textColor: 'text-on-error-container',
  },
  ABSTAIN: {
    label: 'Wstrzymało się',
    lineColor: 'bg-[#ffb597]/30',
    textColor: 'text-[#c47a4a]',
  },
  ABSENT: {
    label: 'Nieobecni',
    lineColor: 'bg-outline-variant/30',
    textColor: 'text-on-surface-variant',
  },
} as const

export const MEPVoteGroup = ({ votes, variant }: MEPVoteGroupProps) => {
  if (votes.length === 0) return null

  const { label, lineColor, textColor } = VARIANT_CONFIG[variant]

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div
          className={cn(
            'font-display font-black flex items-center gap-2 uppercase tracking-tighter text-lg whitespace-nowrap',
            textColor,
          )}
        >
          {label} ({votes.length})
        </div>
        <div className={cn('h-0.5 grow', lineColor)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {votes.map((vote) => (
          <Link
            key={vote.mep.id}
            href={`/poslowie/${vote.mep.slug}`}
            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-outline-variant/10 hover:border-primary/20 hover:shadow-sm transition-all"
            data-epgroup={vote.mep.epGroup ?? ''}
          >
            <div
              className="w-10 rounded-lg bg-surface-variant overflow-hidden shrink-0 ring-1 ring-outline-variant/40"
              style={{ aspectRatio: '3/4' }}
            >
              {vote.mep.photoUrl ? (
                <Image
                  src={vote.mep.photoUrl}
                  alt={vote.mep.fullName}
                  width={40}
                  height={53}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-on-surface-variant">
                  {vote.mep.fullName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0 gap-1">
              <span className="text-sm font-bold text-primary leading-tight">
                {vote.mep.fullName}
              </span>
              <span className="text-xs font-medium text-on-surface-variant tracking-tight">
                {[vote.mep.epGroup, vote.mep.nationalParty]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
