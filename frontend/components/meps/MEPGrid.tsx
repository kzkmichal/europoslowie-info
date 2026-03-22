'use client'
import { useMemo } from 'react'
import { MEPWithStats } from '@/lib/types'
import { MEPCard } from '@/components/meps/MEPCard'

const EP_GROUP_FULL_NAMES: Record<string, string> = {
  EPP: 'Europejska Partia Ludowa',
  'S&D': 'Socjaliści i Demokraci',
  'Patriots for Europe': 'Patrioci dla Europy',
  ECR: 'Europejscy Konserwatyści i Reformatorzy',
  Renew: 'Odnówmy Europę',
  'Renew Europe': 'Odnówmy Europę',
  Greens: 'Zieloni / Wolne Przymierze Europejskie',
  ESN: 'Europa Suwerennych Narodów',
  NI: 'Niezrzeszeni',
  Niezrzeszeni: 'Niezrzeszeni',
}

function GroupedMEPList({ meps }: { meps: MEPWithStats[] }) {
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
        const fullName = EP_GROUP_FULL_NAMES[group]
        return (
          <section key={group}>
            <div className="mb-4 border-b border-gray-200 pb-2">
              <h2 className="text-lg font-semibold text-gray-800">
                {group}
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({groupMeps.length})
                </span>
              </h2>
              {fullName && fullName !== group && (
                <p className="text-sm text-gray-500">{fullName}</p>
              )}
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <Input
          placeholder="Szukaj posła..."
          className="sm:max-w-xs"
          type="search"
          value={filters.search}
          onChange={handleSearchChange}
        />
        <Select
          value={filters.nationalParty || '__all__'}
          onValueChange={handleNationalPartyChange}
        >
          <SelectTrigger className="sm:max-w-50">
            <SelectValue placeholder="Polska partia" />
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
          <SelectTrigger className="sm:max-w-50">
            <SelectValue placeholder="Eurogrupa" />
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
          <SelectTrigger className="sm:max-w-50">
            <SelectValue placeholder="Frekwencja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Wszystkie frekwencje</SelectItem>
            <SelectItem value="high">Wysoka ≥90%</SelectItem>
            <SelectItem value="medium">Średnia 70–89%</SelectItem>
            <SelectItem value="low">Niska &lt;70%</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={handleSortBy}>
          <SelectTrigger className="sm:max-w-50">
            <SelectValue placeholder="Sortuj według" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ranking">Ranking</SelectItem>
            <SelectItem value="attendance">Frekwencja</SelectItem>
            <SelectItem value="name">Nazwisko</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Wyczyść filtry
          </Button>
        )}
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Wyświetlono {filteredList.length} z {meps?.length ?? 0} posłów
      </p>

      {filteredList.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-600">Brak posłów spełniających kryteria</p>
        </div>
      ) : hasActiveFilters ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
