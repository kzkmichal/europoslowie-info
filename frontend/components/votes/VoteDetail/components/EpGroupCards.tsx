import { EP_GROUP_FULL } from '@/lib/constants'
import type { EpGroupRow } from '@/lib/types'

export const toGroupId = (group: string) =>
  `epg-${group.replace(/[^a-zA-Z0-9]/g, '-')}`

type EpGroupCardsProps = {
  rows: EpGroupRow[]
}

export const EpGroupCards = ({ rows }: EpGroupCardsProps) => {
  if (rows.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {rows.map((row) => (
        <label
          key={row.epGroup}
          htmlFor={toGroupId(row.epGroup)}
          className="bg-white p-5 rounded-lg justify-between border border-outline-variant/20 shadow-sm flex flex-col gap-3 cursor-pointer transition-all has-checked:border-primary/40 has-checked:bg-primary/5 has-checked:shadow-md"
        >
          <input
            type="radio"
            id={toGroupId(row.epGroup)}
            name="epg"
            className="sr-only"
          />
          <div className="flex justify-between items-start gap-2">
            <div className="flex flex-col">
              <span className="font-display font-black text-2xl text-primary tracking-tighter leading-none">
                {row.epGroup}
              </span>
              {EP_GROUP_FULL[row.epGroup] && (
                <span className="text-xs text-on-surface-variant mt-0.5">
                  {EP_GROUP_FULL[row.epGroup]}
                </span>
              )}
            </div>
            <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-md text-xs font-black">
              {row.total}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold">
            {row.for > 0 && (
              <span className="text-primary-container">{row.for} Za</span>
            )}
            {row.against > 0 && (
              <span className="text-on-error-container">
                {row.against} Przec.
              </span>
            )}
            {row.abstain > 0 && (
              <span className="text-on-tertiary-fixed-variant">
                {row.abstain} Wstrz.
              </span>
            )}
            {row.absent > 0 && (
              <span className="text-on-surface-variant">
                {row.absent} Nieob.
              </span>
            )}
          </div>
        </label>
      ))}
    </div>
  )
}
