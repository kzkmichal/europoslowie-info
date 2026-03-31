import { StatsTable } from '@/components/meps/StatsTable'
import { CommitteeList } from '@/components/meps/CommitteeList'
import type { MEPProfile } from '@/lib/types'
import type { MepDocument } from '@/lib/db/schema'
import { getAttendanceColor } from '@/lib/constants'

type ProfileTabProps = {
  mep: MEPProfile
  docs: MepDocument[]
}

export const ProfileTab = ({ mep, docs }: ProfileTabProps) => {
  const totalFor = mep.monthlyStats.reduce((s, m) => s + m.votesFor, 0)
  const totalAgainst = mep.monthlyStats.reduce((s, m) => s + m.votesAgainst, 0)
  const totalAbstain = mep.monthlyStats.reduce((s, m) => s + m.votesAbstain, 0)
  const totalAbsent = mep.monthlyStats.reduce((s, m) => s + m.votesAbsent, 0)
  const totalSpeeches = mep.monthlyStats.reduce((s, m) => s + (m.speechesCount ?? 0), 0)
  const totalQuestions = mep.monthlyStats.reduce((s, m) => s + (m.questionsCount ?? 0), 0)
  const avgAttendance =
    mep.monthlyStats.length > 0
      ? mep.monthlyStats.reduce((s, m) => s + m.attendanceRate, 0) / mep.monthlyStats.length
      : 0
  const rapporteurCount = docs.filter(
    (d) => d.role === 'RAPPORTEUR' || d.role === 'RAPPORTEUR_CO',
  ).length
  const authorCount = docs.filter((d) => d.role === 'AUTHOR').length

  return (
    <div className="space-y-8">
      {mep.monthlyStats.length > 0 && (
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="row-span-2 bg-surface-container-low p-4 rounded-xl text-center flex flex-col items-center justify-center gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Śr. obecność
            </p>
            <p
              className="text-4xl font-black font-display"
              style={{ color: getAttendanceColor(avgAttendance) }}
            >
              {avgAttendance.toFixed(1)}%
            </p>
            <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(avgAttendance, 100)}%`,
                  backgroundColor: getAttendanceColor(avgAttendance),
                }}
              />
            </div>
          </div>

          {[
            { label: 'Za', value: totalFor, color: 'text-on-primary-container' },
            { label: 'Przeciw', value: totalAgainst, color: 'text-on-error-container' },
            { label: 'Wstrzymania', value: totalAbstain, color: 'text-on-tertiary-fixed-variant' },
            { label: 'Nieobecności', value: totalAbsent, color: 'text-on-surface-variant' },
            { label: 'Przemówienia', value: totalSpeeches, color: 'text-primary' },
            { label: 'Pytania', value: totalQuestions, color: 'text-primary' },
            { label: 'Sprawozdawca', value: rapporteurCount, color: 'text-primary' },
            { label: 'Autor dokumentu', value: authorCount, color: 'text-primary' },
          ].map((tile) => (
            <div key={tile.label} className="bg-surface-container-low p-4 rounded-xl text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                {tile.label}
              </p>
              <p className={`text-3xl font-black font-display ${tile.color}`}>{tile.value}</p>
            </div>
          ))}
        </section>
      )}

      {mep.monthlyStats.length > 0 && (
        <section className="bg-surface-container-low rounded-xl p-6">
          <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-6 border-b border-outline-variant/15 pb-4">
            Historia miesięczna
          </h3>
          <StatsTable stats={mep.monthlyStats} />
        </section>
      )}

      {mep.committees.length > 0 && (
        <CommitteeList committees={mep.committees} />
      )}
    </div>
  )
}
