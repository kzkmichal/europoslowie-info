type PolandRelevanceData = {
  relevance: 'kluczowe' | 'istotne' | 'neutralne'
  score: number
  reasoning: string
  key_factors: string[]
  low_confidence: boolean
}

type VoteContextPanelProps = {
  contextAi: string
  bullets: string[] | null
  isAiGenerated: boolean
  sourceUrl: string | null
  topicCategory: string | null
  polandScore: number | null
  polandRelevanceData?: PolandRelevanceData | null
}

const getPolandTierLabel = (score: number): string => {
  if (score >= 70) return '🔴 Kluczowe dla Polski'
  if (score >= 40) return '🟡 Istotne dla Polski'
  return '⚪ Neutralne'
}

const getPolandTierClass = (score: number): string => {
  if (score >= 70)
    return 'text-red-800 bg-red-50 border border-red-200'
  if (score >= 40)
    return 'text-yellow-800 bg-yellow-50 border border-yellow-200'
  return 'text-outline bg-surface-container border border-outline-variant/30'
}

export const VoteContextPanel = ({
  contextAi,
  bullets,
  isAiGenerated,
  sourceUrl,
  topicCategory,
  polandScore,
  polandRelevanceData,
}: VoteContextPanelProps) => {
  return (
    <section className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/30 shadow-sm w-full h-full">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-display font-bold text-xl text-primary">
          Kontekst głosowania
        </h2>
        {isAiGenerated && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-secondary-container/60 text-on-secondary-container border border-secondary-container">
            ✦ AI
          </span>
        )}
      </div>
      <p className="text-base text-on-surface/90 leading-relaxed whitespace-pre-wrap">
        {contextAi}
      </p>
      {bullets && bullets.length > 0 && (
        <ul className="mt-4 space-y-2">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-on-surface/80">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              {bullet}
            </li>
          ))}
        </ul>
      )}
      {(topicCategory || polandScore != null || sourceUrl) && (
        <div className="mt-8 pt-6 border-t border-outline-variant/10 flex flex-wrap items-center gap-2">
          {topicCategory && (
            <span className="bg-secondary-container/50 text-on-secondary-container px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide">
              {topicCategory}
            </span>
          )}
          {polandScore != null && (
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getPolandTierClass(polandScore)}`}>
              {getPolandTierLabel(polandScore)}
            </span>
          )}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs text-primary/60 hover:text-primary transition-colors"
            >
              Źródło →
            </a>
          )}
        </div>
      )}
      {polandRelevanceData?.reasoning && (
        <div className="mt-4 pt-4 border-t border-outline-variant/10">
          <p className="text-sm text-on-surface/70 leading-relaxed">
            {polandRelevanceData.reasoning}
          </p>
          {polandRelevanceData.key_factors.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {polandRelevanceData.key_factors.map((factor, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-container text-on-surface/60 border border-outline-variant/20"
                >
                  {factor}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
