import type { VoteWithMEP, EpGroupRow } from '@/lib/types'
import { EpGroupCards, toGroupId } from './EpGroupCards'
import { MEPVoteGroup } from './MEPVoteGroup'

type PolishMEPsSectionProps = {
  polishVotes: {
    FOR: VoteWithMEP[]
    AGAINST: VoteWithMEP[]
    ABSTAIN: VoteWithMEP[]
    ABSENT: VoteWithMEP[]
  }
  summary: {
    for: number
    against: number
    abstain: number
    absent: number
  }
  epGroupRows: EpGroupRow[]
}

export const PolishMEPsSection = ({
  polishVotes,
  summary,
  epGroupRows,
}: PolishMEPsSectionProps) => {
  const total = summary.for + summary.against + summary.abstain + summary.absent
  const attended = total - summary.absent
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100))

  const filterCss = epGroupRows.length > 0
    ? `
      ${epGroupRows.map(({ epGroup }) => `
        .epg-filter:has(#${toGroupId(epGroup)}:checked) [data-epgroup="${epGroup}"] {
          outline: 2px solid #7796d1;
          background-color: #eef2ff;
          transition: outline 0.15s, background-color 0.15s;
        }
      `).join('')}
    `
    : ''

  return (
    <section className="epg-filter bg-surface-container-low rounded-3xl p-6 lg:p-8 border border-outline-variant/15">
      {filterCss && <style>{filterCss}</style>}

      <input type="radio" id="epg-all" name="epg" className="sr-only" defaultChecked />

      <div className="flex flex-col gap-8 mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="font-display font-black text-3xl text-primary tracking-tight mb-2">
              Głosy Polskich Europosłów
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-on-surface-variant">
                Frekwencja:{' '}
                <span className="text-on-surface font-bold">
                  {attended}/{total}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-6 w-full flex rounded-full overflow-hidden shadow-inner bg-surface-container-highest">
            {summary.for > 0 && (
              <div
                className="bg-primary-container h-full transition-all duration-500"
                style={{ width: `${pct(summary.for)}%` }}
              />
            )}
            {summary.against > 0 && (
              <div
                className="bg-error h-full transition-all duration-500"
                style={{ width: `${pct(summary.against)}%` }}
              />
            )}
            {summary.abstain > 0 && (
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${pct(summary.abstain)}%`, backgroundColor: '#ffb597' }}
              />
            )}
            {summary.absent > 0 && (
              <div
                className="bg-outline-variant h-full transition-all duration-500"
                style={{ width: `${pct(summary.absent)}%` }}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-6 justify-center text-xs font-black uppercase tracking-widest text-on-surface-variant">
            {summary.for > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary-container" />
                {summary.for} Za
              </div>
            )}
            {summary.against > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-error" />
                {summary.against} Przeciw
              </div>
            )}
            {summary.abstain > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ffb597' }} />
                {summary.abstain} Wstrzymało się
              </div>
            )}
            {summary.absent > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-outline-variant" />
                {summary.absent} Nieobecni
              </div>
            )}
          </div>
        </div>
      </div>

      {epGroupRows.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase text-on-surface-variant tracking-widest">
              Wyniki według grup politycznych (Polska)
            </h3>
            <label
              htmlFor="epg-all"
              className="text-xs font-bold text-primary cursor-pointer hover:underline epg-reset"
            >
              Pokaż wszystkich
            </label>
          </div>
          <EpGroupCards rows={epGroupRows} />
        </div>
      )}

      <div className="space-y-12">
        <MEPVoteGroup votes={polishVotes.FOR} variant="FOR" />
        <MEPVoteGroup votes={polishVotes.AGAINST} variant="AGAINST" />
        <MEPVoteGroup votes={polishVotes.ABSTAIN} variant="ABSTAIN" />
        <MEPVoteGroup votes={polishVotes.ABSENT} variant="ABSENT" />
      </div>
    </section>
  )
}
