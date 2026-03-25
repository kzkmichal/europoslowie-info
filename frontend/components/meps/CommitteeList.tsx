import type { CommitteeMembership } from '@/lib/db/schema'
import type { BaseProps } from '@/lib/types'
import { cn } from '@/lib/utils'

type CommitteeListProps = BaseProps & {
  committees: CommitteeMembership[]
}

export function CommitteeList({
  committees,
  className,
  'data-testid': dataTestId,
  'data-cc': dataCc,
  id,
}: CommitteeListProps) {
  if (committees.length === 0) {
    return (
      <div className="text-sm text-outline">Brak członkostwa w komisjach</div>
    )
  }

  return (
    <div
      className={cn('space-y-3', className)}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      {committees.map((committee) => (
        <div
          key={committee.id}
          className="rounded-md bg-surface-container-lowest p-4 shadow-ambient"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-display font-semibold text-on-surface">
                {committee.committeeName}
              </h3>
              {committee.committeeCode && (
                <p className="mt-1 text-sm text-outline">
                  Kod: {committee.committeeCode}
                </p>
              )}
            </div>
            {committee.role && (
              <span
                className={cn(
                  'ml-4 rounded px-3 py-1 text-xs font-medium',
                  committee.role === 'member' &&
                    'bg-secondary-container text-on-secondary-container',
                  committee.role === 'chair' &&
                    'bg-tertiary-fixed text-on-tertiary-fixed-variant',
                  committee.role === 'vice-chair' &&
                    'bg-on-primary-container text-primary',
                  committee.role === 'substitute' &&
                    'bg-surface-container-high text-on-surface-variant',
                )}
              >
                {committee.role === 'member' && 'Członek'}
                {committee.role === 'chair' && 'Przewodniczący'}
                {committee.role === 'vice-chair' && 'Wiceprzewodniczący'}
                {committee.role === 'substitute' && 'Zastępca'}
              </span>
            )}
          </div>
          {committee.fromDate && (
            <div className="mt-2 text-xs text-outline">
              <span className="font-medium">Od: </span>
              {new Date(committee.fromDate).toLocaleDateString('pl-PL', {
                year: 'numeric',
                month: 'long',
              })}
              {committee.toDate && (
                <>
                  <span className="mx-1">—</span>
                  <span className="font-medium">Do: </span>
                  {new Date(committee.toDate).toLocaleDateString('pl-PL', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
