import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import type { VoteSource } from '@/lib/types'

const SOURCE_LABEL: Record<string, string> = {
  REPORT: 'Raport komisji',
  OEIL_SUMMARY: 'Podsumowanie OEIL',
  PROCEDURE_OEIL: 'Plik proceduralny OEIL',
  PRESS_RELEASE: 'Komunikat prasowy',
  VOT_XML: 'Wyniki głosowania (XML)',
  RCV_XML: 'Głosowanie imienne (XML)',
}

const SOURCE_DESCRIPTION: Record<string, string> = {
  REPORT: 'Pełny raport komisji parlamentarnej z analizą i rekomendacjami.',
  OEIL_SUMMARY:
    'Podsumowanie procedury legislacyjnej w systemie Legislative Observatory.',
  PROCEDURE_OEIL:
    'Szczegółowa historia legislacyjna i status procedury w systemie Legislative Observatory.',
  PRESS_RELEASE: 'Oficjalny komunikat prasowy Parlamentu Europejskiego.',
  VOT_XML:
    'Surowe dane techniczne o wynikach wszystkich europosłów w formacie XML.',
  RCV_XML: 'Dane głosowania imiennego (RCV) w formacie XML.',
}

type VoteSourcesPanelProps = {
  sources: VoteSource[]
}

export const VoteSourcesPanel = ({ sources }: VoteSourcesPanelProps) => {
  if (sources.length === 0) return null

  return (
    <section className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex flex-col h-full">
      <h2 className="font-display font-bold text-lg text-primary mb-4">
        Oficjalne Źródła Danych
      </h2>
      <div className="space-y-2 grow">
        {sources.map((source) => (
          <Link
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start justify-between p-3 bg-surface-container-low rounded-xl group transition-all hover:bg-primary/5 border border-transparent hover:border-primary/20"
          >
            <div className="flex flex-col gap-1 max-w-[85%]">
              <span className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">
                {SOURCE_LABEL[source.sourceType] ?? source.name}
              </span>
              <span className="text-xs leading-relaxed text-on-surface-variant/80">
                {SOURCE_DESCRIPTION[source.sourceType] ?? source.name}
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-outline group-hover:text-primary shrink-0 mt-0.5" />
          </Link>
        ))}
      </div>
    </section>
  )
}
