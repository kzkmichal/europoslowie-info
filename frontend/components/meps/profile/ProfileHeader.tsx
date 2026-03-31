import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import type { MEPProfile } from '@/lib/types'
import { EP_GROUP_FULL } from '@/lib/constants'

type ProfileHeaderProps = {
  mep: MEPProfile
  docsCount: number
}

export const ProfileHeader = ({ mep, docsCount }: ProfileHeaderProps) => {
  const avgAttendance =
    mep.monthlyStats.length > 0
      ? mep.monthlyStats.reduce((s, m) => s + m.attendanceRate, 0) / mep.monthlyStats.length
      : 0

  const totalVotes = mep.monthlyStats.reduce((s, m) => s + m.totalVotes, 0)
  const epProfileUrl = `https://www.europarl.europa.eu/meps/pl/${mep.epId}/${mep.fullName.toUpperCase().replace(/\s+/g, '_')}/home`

  return (
    <section className="bg-surface-container-low rounded-xl p-6 mb-6">
      <div className="flex gap-6 items-start">
        <div className="shrink-0 w-24 lg:w-32 aspect-[3/4] rounded-lg overflow-hidden bg-surface-container-highest">
          {mep.photoUrl ? (
            <Image
              src={mep.photoUrl}
              alt={mep.fullName}
              width={128}
              height={171}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl font-black text-on-surface-variant">
              {mep.fullName.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="font-display font-black text-primary tracking-tight">
                {mep.fullName}
              </h1>
              {mep.nationalParty && (
                <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded uppercase tracking-wider">
                  {mep.nationalParty}
                </span>
              )}
            </div>
            {mep.epGroup && (
              <p className="text-sm">
                <span className="font-bold text-primary mr-1.5">{mep.epGroup}</span>
                {EP_GROUP_FULL[mep.epGroup] && EP_GROUP_FULL[mep.epGroup] !== mep.epGroup && (
                  <span className="text-outline">{EP_GROUP_FULL[mep.epGroup]}</span>
                )}
              </p>
            )}
          </div>

          {mep.committees.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {mep.committees.map((c) => (
                <span
                  key={c.id}
                  className="px-2 py-0.5 bg-surface-container-highest text-on-surface-variant font-mono text-[10px] font-semibold rounded"
                >
                  {c.committeeCode}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-6 pt-1 border-t border-outline-variant/20">
            {[
              { label: 'Frekwencja', value: `${avgAttendance.toFixed(1)}%` },
              { label: 'Głosowań', value: totalVotes.toLocaleString('pl-PL') },
              { label: 'Dokumenty', value: docsCount },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-[10px] uppercase font-bold tracking-[0.15em] text-outline mb-0.5">
                  {stat.label}
                </p>
                <p className="text-base font-display font-bold text-primary">{stat.value}</p>
              </div>
            ))}

            <a
              href={epProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground uppercase tracking-wider hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Profil w EP
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
