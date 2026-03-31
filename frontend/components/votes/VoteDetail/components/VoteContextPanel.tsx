type VoteContextPanelProps = {
  contextAi: string
  bullets: string[] | null
  isAiGenerated: boolean
  sourceUrl: string | null
  topicCategory: string | null
  starsPoland: number | null
}

export const VoteContextPanel = ({
  contextAi,
  bullets,
  isAiGenerated,
  sourceUrl,
  topicCategory,
  starsPoland,
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
      {(topicCategory || starsPoland != null || sourceUrl) && (
        <div className="mt-8 pt-6 border-t border-outline-variant/10 flex flex-wrap items-center gap-2">
          {topicCategory && (
            <span className="bg-secondary-container/50 text-on-secondary-container px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide">
              {topicCategory}
            </span>
          )}
          {starsPoland != null && (
            <div className="flex items-center gap-1.5 text-on-tertiary-container bg-tertiary-fixed/30 px-3 py-1.5 rounded-lg">
              <span className="text-xs font-bold">
                {starsPoland}⭐ Ważność dla Polski
              </span>
            </div>
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
    </section>
  )
}
