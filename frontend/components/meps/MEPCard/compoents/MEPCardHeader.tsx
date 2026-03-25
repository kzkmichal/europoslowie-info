import Image from 'next/image'
import type { MEPWithStats } from '@/lib/types'

export const MEPCardHeader = ({ mep }: { mep: MEPWithStats }) => {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="relative w-[60px] h-20 shrink-0 overflow-hidden rounded-lg">
        {mep.photoUrl ? (
          <Image
            src={mep.photoUrl}
            alt={mep.fullName}
            width={60}
            height={80}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl font-bold text-on-surface-variant bg-surface-container-high">
            {mep.fullName.charAt(0)}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap gap-1 mb-2">
          {mep.epGroup && (
            <span className="px-2 py-0.5 bg-secondary-container/30 text-on-secondary-container text-[10px] font-bold uppercase tracking-wider rounded-full">
              {mep.epGroup}
            </span>
          )}
          {mep.nationalParty && (
            <span className="px-2 py-0.5 bg-surface-variant text-on-surface-variant text-[10px] font-bold uppercase tracking-wider rounded-full">
              {mep.nationalParty}
            </span>
          )}
        </div>
        <h3 className="font-display font-extrabold text-lg text-primary leading-tight">
          {mep.fullName}
        </h3>
      </div>
    </div>
  )
}
