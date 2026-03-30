import { BaseProps, MEPVote } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Check, X, Minus, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type VoteRowProps = BaseProps & {
  vote: MEPVote
}

const CHOICE_CONFIG = {
  FOR: {
    tileBg: 'bg-on-primary-container/10',
    iconBg: 'bg-primary-container',
    labelColor: 'text-primary-container',
    label: 'ZA',
    Icon: Check,
  },
  AGAINST: {
    tileBg: 'bg-error-container',
    iconBg: 'bg-on-error-container',
    labelColor: 'text-on-error-container',
    label: 'PRZECIW',
    Icon: X,
  },
  ABSTAIN: {
    tileBg: 'bg-tertiary-fixed',
    iconBg: 'bg-on-tertiary-fixed-variant',
    labelColor: 'text-on-tertiary-fixed-variant',
    label: 'WSTRZ.',
    Icon: Minus,
  },
  ABSENT: {
    tileBg: 'bg-surface-container-high',
    iconBg: 'bg-outline',
    labelColor: 'text-on-surface-variant',
    label: 'NIEOB.',
    Icon: Clock,
  },
} as const

export const VoteRow = ({ vote }: VoteRowProps) => {
  const choice =
    CHOICE_CONFIG[vote.voteChoice as keyof typeof CHOICE_CONFIG] ??
    CHOICE_CONFIG.ABSENT
  const { tileBg, iconBg, labelColor, label, Icon } = choice

  const content = (
    <div className="flex items-center gap-6 rounded-xl border border-transparent bg-surface-container-lowest p-4 transition-all duration-300 hover:border-outline-variant/30">
      <div
        className={cn(
          'flex min-w-[80px] flex-col items-center justify-center rounded-lg p-3 gap-2',
          tileBg,
        )}
      >
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full text-white',
            iconBg,
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <span className={cn('text-xs font-black uppercase', labelColor)}>
          {label}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {vote.relatedCount != null && vote.relatedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-outline">
              +{vote.relatedCount} głosowań
            </span>
          </div>
        )}

        <h4 className="text-primary text-lg">{vote.title}</h4>

        {vote.result && (
          <div className="flex items-center gap-2">
            <p className="text-sm text-outline">Wynik ogólny:</p>
            <Badge
              variant={vote.result === 'ADOPTED' ? 'voteFor' : 'voteAgainst'}
              className="px-3 py-1 text-sm"
            >
              {vote.result === 'ADOPTED' ? 'Przyjęto' : 'Odrzucono'}
            </Badge>
          </div>
        )}
      </div>

      <ChevronRight className="h-5 w-5 shrink-0 text-outline" />
    </div>
  )

  return vote.voteNumber ? (
    <Link href={`/glosowania/${vote.voteNumber}`} className="block">
      {content}
    </Link>
  ) : (
    content
  )
}
