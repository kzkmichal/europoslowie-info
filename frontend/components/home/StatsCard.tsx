type SiteStats = {
  sessionsCount: number
  votesCount: number
  committeesCount: number
  epGroupsCount: number
}

type StatsCardProps = {
  mepsCount: number
  stats: SiteStats
}

export const StatsCard = ({ mepsCount, stats }: StatsCardProps) => (
  <div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant/15 p-6 rounded-lg flex flex-col justify-between min-h-64">
    <div>
      <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-4 block">
        Aktualne Statystyki
      </span>
      <h2 className="text-3xl font-display font-bold text-primary mb-2">
        {mepsCount} Europosłów z Polski
      </h2>
      <p className="text-on-surface-variant max-w-md text-sm">
        10. Kadencja PE (2024–2029) — śledzimy głosowania, przemówienia, pytania
        parlamentarne i komisje.
      </p>
    </div>
    <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-5">
      <div>
        <div className="text-3xl font-display font-extrabold text-primary">
          {stats.sessionsCount.toLocaleString('pl-PL')}
        </div>
        <div className="text-xs text-on-surface-variant font-medium">
          Sesji plenarnych
        </div>
      </div>
      <div>
        <div className="text-3xl font-display font-extrabold text-primary">
          {stats.votesCount.toLocaleString('pl-PL')}
        </div>
        <div className="text-xs text-on-surface-variant font-medium">
          Głosowań w bazie
        </div>
      </div>
      <div>
        <div className="text-3xl font-display font-extrabold text-primary">
          {stats.committeesCount.toLocaleString('pl-PL')}
        </div>
        <div className="text-xs text-on-surface-variant font-medium">
          Komisji parlamentarnych
        </div>
      </div>
      <div>
        <div className="text-3xl font-display font-extrabold text-primary">
          {stats.epGroupsCount.toLocaleString('pl-PL')}
        </div>
        <div className="text-xs text-on-surface-variant font-medium">
          Grup politycznych
        </div>
      </div>
    </div>
  </div>
)
