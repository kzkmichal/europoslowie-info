type GlobalResultsPanelProps = {
  votesFor: number | null
  votesAgainst: number | null
  votesAbstain: number | null
}

export const GlobalResultsPanel = ({
  votesFor,
  votesAgainst,
  votesAbstain,
}: GlobalResultsPanelProps) => {
  const forCount = votesFor ?? 0
  const againstCount = votesAgainst ?? 0
  const abstainCount = votesAbstain ?? 0
  const total = forCount + againstCount + abstainCount

  if (total === 0) return null

  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100))

  return (
    <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/20 flex flex-col">
      <h2 className="font-display font-bold text-xl text-primary mb-8">
        Wyniki Parlamentu Europejskiego
      </h2>
      <div className="grow flex flex-col justify-center gap-8">
        <div className="h-6 w-full flex rounded-full overflow-hidden bg-surface-container-highest shadow-inner">
          {forCount > 0 && (
            <div
              className="bg-primary/90 h-full transition-all duration-500"
              style={{ width: `${pct(forCount)}%` }}
            />
          )}
          {againstCount > 0 && (
            <div
              className="bg-error/90 h-full transition-all duration-500"
              style={{ width: `${pct(againstCount)}%` }}
            />
          )}
          {abstainCount > 0 && (
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${pct(abstainCount)}%`,
                backgroundColor: '#ffb597',
              }}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase text-on-surface-variant tracking-wider">
                Głosy Za
              </span>
              <span className="text-2xl font-black font-display text-primary">
                {forCount.toLocaleString('pl-PL')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-error shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase text-on-surface-variant tracking-wider">
                Głosy Przeciw
              </span>
              <span className="text-2xl font-black font-display text-primary">
                {againstCount.toLocaleString('pl-PL')}
              </span>
            </div>
          </div>
          {abstainCount > 0 && (
            <div className="flex items-center gap-3">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: '#ffb597' }}
              />
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase text-on-surface-variant tracking-wider">
                  Wstrzymało się
                </span>
                <span className="text-2xl font-black font-display text-primary">
                  {abstainCount.toLocaleString('pl-PL')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
