import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { BaseProps, VoteSource } from '@/lib/types'

/** Human-readable category label shown above the links. */
const SOURCE_CATEGORY: Record<string, string> = {
  REPORT:         'Dokumenty',
  OEIL_SUMMARY:   'Dokumenty',
  PROCEDURE_OEIL: 'Dokumenty',
  PRESS_RELEASE:  'Dokumenty',
  VOT_XML:        'Dane techniczne',
  RCV_XML:        'Dane techniczne',
}

/** Short suffix appended to each source type link. */
const SOURCE_TYPE_SUFFIX: Record<string, string> = {
  REPORT:         '',
  OEIL_SUMMARY:   '',
  PROCEDURE_OEIL: '',
  PRESS_RELEASE:  '',
  VOT_XML:        ' (XML)',
  RCV_XML:        ' (XML)',
}

type VoteSourcesProps = BaseProps & {
  sources: VoteSource[]
}

export function VoteSources({
  sources,
  className,
  'data-testid': dataTestId,
  'data-cc': dataCc,
  id,
}: VoteSourcesProps) {
  if (sources.length === 0) return null

  // Split into "Dokumenty" group (REPORT, PROCEDURE_OEIL, PRESS_RELEASE)
  // and "Dane techniczne" group (VOT_XML, RCV_XML).
  const documents = sources.filter(
    (s) => SOURCE_CATEGORY[s.sourceType] === 'Dokumenty',
  )
  const technical = sources.filter(
    (s) => SOURCE_CATEGORY[s.sourceType] === 'Dane techniczne',
  )

  return (
    <section
      className={cn('mb-8', className)}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      <h2 className="mb-4 text-2xl font-bold text-gray-900">Źródła</h2>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        {documents.length > 0 && (
          <div className={cn(technical.length > 0 && 'mb-4')}>
            <ul className="space-y-2">
              {documents.map((source) => (
                <li key={source.id} className="flex items-start gap-2">
                  <span className="mt-0.5 text-gray-400">↗</span>
                  <Link
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {source.name}
                    {SOURCE_TYPE_SUFFIX[source.sourceType]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {technical.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              Dane techniczne
            </p>
            <ul className="space-y-1">
              {technical.map((source) => (
                <li key={source.id} className="flex items-start gap-2">
                  <span className="mt-0.5 text-gray-300">↗</span>
                  <Link
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 hover:underline"
                  >
                    {source.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
