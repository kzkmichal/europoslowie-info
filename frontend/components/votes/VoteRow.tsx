import { BaseProps, MEPVote } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Check,
  X,
  Minus,
  Clock,
  ChevronRight,
  CheckCircle,
  XCircle,
} from 'lucide-react'
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

  const isAdopted = vote.result === 'ADOPTED'

  const content = (
    <div className="flex items-center gap-3 sm:gap-6 rounded-xl border border-transparent bg-surface-container-lowest p-3 sm:p-4 transition-colors hover:border-outline-variant/30">
      <div
        className={cn(
          'min-w-14 sm:min-w-20 flex-col items-center justify-center rounded-lg p-2 md:p-3 hidden md:flex gap-1.5 md:gap-2',
          tileBg,
        )}
      >
        <span
          className={cn(
            'flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full text-white',
            iconBg,
          )}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
        </span>
        <span
          className={cn(
            'text-[10px] sm:text-xs font-black uppercase',
            labelColor,
          )}
        >
          {label}
        </span>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div
            className={cn(
              'items-center justify-center mr-auto rounded-lg p-2 md:p-3 flex md:hidden gap-1.5 md:gap-2',
              tileBg,
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-white',
                iconBg,
              )}
            >
              <Icon className="h-3 w-3 sm:h-5 sm:w-5" strokeWidth={2.5} />
            </span>
            <span
              className={cn(
                'text-[10px] sm:text-xs font-black uppercase',
                labelColor,
              )}
            >
              {label}
            </span>
          </div>
          {vote.result && (
            <Badge variant={isAdopted ? 'voteFor' : 'voteAgainst'}>
              {isAdopted ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              {isAdopted ? 'Przyjęto' : 'Odrzucono'}
            </Badge>
          )}
          {vote.polandScore != null && vote.polandScore >= 70 && (
            <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
              🔴 Kluczowe
            </Badge>
          )}
          {vote.polandScore != null &&
            vote.polandScore >= 40 &&
            vote.polandScore < 70 && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                🟡 Istotne
              </Badge>
            )}
        </div>
        <h3 className="text-primary text-sm md:text-md">{vote.title}</h3>
        {vote.relatedCount != null && vote.relatedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-outline">
              +{vote.relatedCount} głosowań
            </span>
          </div>
        )}
      </div>
      <ChevronRight className="hidden md:block h-5 w-5 shrink-0 text-outline" />
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
