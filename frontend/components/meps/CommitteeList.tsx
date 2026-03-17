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
      <div className="text-sm text-gray-500">Brak członkostwa w komisjach</div>
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
          className="rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                {committee.committeeName}
              </h3>
              {committee.committeeCode && (
                <p className="mt-1 text-sm text-gray-500">
                  Kod: {committee.committeeCode}
                </p>
              )}
            </div>
            {committee.role && (
              <span
                className={cn(
                  'ml-4 rounded-full px-3 py-1 text-xs font-medium',
                  committee.role === 'MEMBER' && 'bg-blue-100 text-blue-800',
                  committee.role === 'CHAIR' && 'bg-purple-100 text-purple-800',
                  committee.role === 'VICE_CHAIR' &&
                    'bg-indigo-100 text-indigo-800',
                  committee.role === 'SUBSTITUTE' && 'bg-gray-100 text-gray-800'
                )}
              >
                {committee.role === 'MEMBER' && 'Członek'}
                {committee.role === 'CHAIR' && 'Przewodniczący'}
                {committee.role === 'VICE_CHAIR' && 'Wiceprzewodniczący'}
                {committee.role === 'SUBSTITUTE' && 'Zastępca'}
              </span>
            )}
          </div>
          {committee.fromDate && (
            <div className="mt-2 text-xs text-gray-600">
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
