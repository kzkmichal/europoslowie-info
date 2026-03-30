import type { CommitteeMembership } from '@/lib/db/schema'
import type { BaseProps } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'
import { COMMITTEE_NAMES_EN, COMMITTEE_ROLE_LABELS } from '@/lib/constants'

type CommitteeListProps = BaseProps & {
  committees: CommitteeMembership[]
}

const isPrimary = (role: string) =>
  role === 'chair' || role === 'vice-chair' || role === 'member'

const formatDate = (date: Date | null) =>
  date
    ? new Date(date).toLocaleDateString('pl-PL', {
        month: 'short',
        year: 'numeric',
      })
    : 'obecnie'

export const CommitteeList = ({
  committees,
  className,
  'data-testid': dataTestId,
  'data-cc': dataCc,
  id,
}: CommitteeListProps) => {
  if (committees.length === 0) {
    return (
      <div className="text-sm text-outline">Brak członkostwa w komisjach</div>
    )
  }

  return (
    <div
      className={cn('bg-surface-container-low rounded-xl p-6', className)}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-6 border-b border-outline-variant/15 pb-4">
        Komisje i delegacje
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {committees.map((committee) => (
          <div key={committee.id} className="flex items-start gap-4 group">
            <div
              className={cn(
                'w-12 h-12 rounded-sm flex items-center justify-center font-bold text-xs shrink-0',
                committee.role && isPrimary(committee.role)
                  ? 'bg-primary-container text-white'
                  : 'bg-surface-container-highest text-primary',
              )}
            >
              {committee.committeeCode}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-primary">
                  {committee.committeeName}
                </p>
              </div>
              {committee.committeeCode &&
                COMMITTEE_NAMES_EN[committee.committeeCode] && (
                  <a
                    href={`https://www.europarl.europa.eu/committees/pl/${committee.committeeCode.toLowerCase()}/home/highlights`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-outline hover:text-primary transition-colors mt-0.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    {COMMITTEE_NAMES_EN[committee.committeeCode]}
                  </a>
                )}
              <div className="flex items-center gap-3 mt-1">
                {committee.role && (
                  <p className="text-[11px] font-bold text-secondary uppercase tracking-tighter">
                    {COMMITTEE_ROLE_LABELS[committee.role] ?? committee.role}
                  </p>
                )}
                <p className="text-[11px] text-outline">
                  {formatDate(committee.fromDate)} –{' '}
                  {formatDate(committee.toDate)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
