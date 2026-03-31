'use client'
import { useMemo } from 'react'
import { MEPWithStats } from '@/lib/types'
import { MEPCard } from '@/components/meps/MEPCard/MEPCard'

import { EP_GROUP_FULL } from '@/lib/constants'

const GroupedMEPList = ({ meps }: { meps: MEPWithStats[] }) => {
  const groups = useMemo(() => {
    const groupMap = new Map<string, MEPWithStats[]>()
    for (const mep of meps) {
      const group = mep.epGroup ?? 'Inne'
      if (!groupMap.has(group)) groupMap.set(group, [])
      groupMap.get(group)!.push(mep)
    }
    return [...groupMap.entries()].sort(([a], [b]) => a.localeCompare(b, 'pl'))
  }, [meps])

  return (
    <div className="space-y-10">
      {groups.map(([group, groupMeps]) => {
        const fullName = EP_GROUP_FULL[group]
        return (
          <section key={group}>
            <div
              className="mb-4 pb-2"
              style={{ borderBottom: '1px solid rgba(196,199,208,0.3)' }}
            >
              <h2 className="font-display text-2xl font-black text-primary">
                {group}
                <span className="ml-2 text-base font-normal text-outline">
                  ({groupMeps.length})
                </span>
              </h2>
              {fullName && fullName !== group && (
                <p className="text-sm font-medium text-on-surface-variant mt-0.5">
                  {fullName}
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {groupMeps.map((mep) => (
                <MEPCard key={mep.id} mep={mep} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useFilterMEP } from '@/hooks/useFilterMEP'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type MEPSGridProps = {
  meps?: MEPWithStats[]
}

export const MEPGrid = ({ meps }: MEPSGridProps) => {
  const {
    filteredList,
    handleSearchChange,
    filters,
    handleNationalPartyChange,
    handleEpGroupChange,
    handleAttendanceRangeChange,
    hasActiveFilters,
    clearFilters,
    sortBy,
    handleSortBy,
  } = useFilterMEP({ initialList: meps })

  const nationalParties = useMemo(
    () =>
      meps
        ?.reduce((acc, mep) => {
          if (mep.nationalParty && !acc.includes(mep.nationalParty)) {
            acc.push(mep.nationalParty)
          }
          return acc
        }, [] as string[])
        .sort() ?? [],
    [meps],
  )

  const epGroups = useMemo(
    () =>
      meps
        ?.reduce((acc, mep) => {
          if (mep.epGroup && !acc.includes(mep.epGroup)) {
            acc.push(mep.epGroup)
          }
          return acc
        }, [] as string[])
        .sort() ?? [],
    [meps],
  )

  const filterTriggerClass =
    'h-10 border border-outline-variant/50 bg-surface-container-lowest rounded-lg px-3 gap-1.5 shadow-none text-sm font-bold text-primary hover:bg-surface-container-low transition-colors [&_[data-slot=select-value]]:font-bold [&_[data-slot=select-value]]:text-primary'

  const filterLabel = (text: string) => (
    <span className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/50 font-display shrink-0">
      {text}
    </span>
  )

  return (
    <>
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Szukaj posła..."
          className="w-48 h-10 border-outline-variant/50 bg-surface-container-lowest placeholder:text-on-surface-variant/40"
          type="search"
          value={filters.search}
          onChange={handleSearchChange}
        />
          <Select
            value={filters.nationalParty || '__all__'}
            onValueChange={handleNationalPartyChange}
          >
            <SelectTrigger className={filterTriggerClass}>
              {filterLabel('Partia')}
              <SelectValue placeholder="Wszystkie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Wszystkie partie</SelectItem>
              {nationalParties.map((party) => (
                <SelectItem key={party} value={party}>
                  {party}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.epGroup || '__all__'}
            onValueChange={handleEpGroupChange}
          >
            <SelectTrigger className={filterTriggerClass}>
              {filterLabel('Eurogrupa')}
              <SelectValue placeholder="Wszystkie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Wszystkie grupy</SelectItem>
              {epGroups.map((group) => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.attendanceRange || '__all__'}
            onValueChange={handleAttendanceRangeChange}
          >
            <SelectTrigger className={filterTriggerClass}>
              {filterLabel('Frekwencja')}
              <SelectValue placeholder="Wszystkie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Wszystkie frekwencje</SelectItem>
              <SelectItem value="high">Wysoka ≥90%</SelectItem>
              <SelectItem value="medium">Średnia 70–89%</SelectItem>
              <SelectItem value="low">Niska &lt;70%</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={handleSortBy}>
            <SelectTrigger className={filterTriggerClass}>
              {filterLabel('Sortuj')}
              <SelectValue placeholder="Sortuj" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ranking">Ranking</SelectItem>
              <SelectItem value="attendance">Frekwencja</SelectItem>
              <SelectItem value="name">Nazwisko</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="ml-auto"
            >
              Wyczyść filtry
            </Button>
          )}
        </div>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Wyświetlono {filteredList.length} z {meps?.length ?? 0} posłów
      </p>

      {filteredList.length === 0 ? (
        <div className="rounded-md bg-surface-container-low p-12 text-center">
          <p className="text-on-surface-variant">
            Brak posłów spełniających kryteria
          </p>
        </div>
      ) : hasActiveFilters ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredList.map((mep) => (
            <MEPCard key={mep.id} mep={mep} />
          ))}
        </div>
      ) : (
        <GroupedMEPList meps={filteredList} />
      )}
    </>
  )
}
