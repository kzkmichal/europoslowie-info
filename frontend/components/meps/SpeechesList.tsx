import type { Speech } from '@/lib/db/schema'
import type { BaseProps } from '@/lib/types'
import { cn } from '@/lib/utils'

type SpeechesListProps = BaseProps & {
  speeches: Speech[]
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function SpeechesList({
  speeches,
  className,
  'data-testid': dataTestId,
  'data-cc': dataCc,
  id,
}: SpeechesListProps) {
  if (speeches.length === 0) {
    return <div className="text-sm text-gray-500">Brak przemówień</div>
  }

  return (
    <div
      className={cn('space-y-3', className)}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      {speeches.map((speech) => (
        <div
          key={speech.id}
          className="rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <p className="flex-1 text-sm font-medium text-gray-900">
              {speech.debateTopic}
            </p>
            {speech.durationSeconds && (
              <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {formatDuration(speech.durationSeconds)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {new Date(speech.speechDate).toLocaleDateString('pl-PL', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          {speech.transcript && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-800">
                Pełny tekst przemówienia
              </summary>
              <div className="mt-2 space-y-2 border-t border-gray-100 pt-2">
                {speech.transcript.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-sm leading-relaxed text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </div>
            </details>
          )}
        </div>
      ))}
    </div>
  )
}
