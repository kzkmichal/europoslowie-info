import { MEPWithStats } from '@/lib/types'
import { useEffect, useMemo, useState } from 'react'

export type UseFilterMEPProps = {
  initialList?: MEPWithStats[]
}

export const useDebounce = (delay: number, value?: string) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export const useFilterMEP = ({ initialList }: UseFilterMEPProps) => {
  const [filters, setFilters] = useState({
    search: '',
    nationalParty: '',
    epGroup: '',
  })
  const [sortBy, setSortBy] = useState<'ranking' | 'attendance' | 'name'>(
    'ranking',
  )
  const debouncedSearchTerm = useDebounce(300, filters.search)

  const filteredList = useMemo(() => {
    return (initialList ?? [])
      .filter((mep) => {
        const matchesSearch = mep.fullName
          .toLowerCase()
          .includes(debouncedSearchTerm?.toLowerCase() ?? '')
        const matchesParty =
          !filters.nationalParty || mep.nationalParty === filters.nationalParty
        const matchesGroup = !filters.epGroup || mep.epGroup === filters.epGroup
        return matchesSearch && matchesParty && matchesGroup
      })
      .sort((a, b) => {
        if (sortBy === 'ranking') {
          const ra = a.latestStats?.rankingAmongPoles ?? 999
          const rb = b.latestStats?.rankingAmongPoles ?? 999
          return ra - rb
        }
        if (sortBy === 'attendance') {
          const aa = a.latestStats?.attendanceRate ?? 0
          const ab = b.latestStats?.attendanceRate ?? 0
          return ab - aa
        }
        if (sortBy === 'name') {
          if (!a.lastName) return 1
          if (!b.lastName) return -1
          return a?.lastName?.localeCompare(b?.lastName, 'pl')
        }
        return 0
      })
  }, [
    debouncedSearchTerm,
    initialList,
    filters.nationalParty,
    filters.epGroup,
    sortBy,
  ])

  const hasActiveFilters =
    filters.search !== '' ||
    filters.nationalParty !== '' ||
    filters.epGroup !== ''

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: event.target.value }))
  }

  const handleNationalPartyChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      nationalParty: value === '__all__' ? '' : value,
    }))
  }

  const handleEpGroupChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      epGroup: value === '__all__' ? '' : value,
    }))
  }

  const handleSortBy = (key: string) => {
    if (key === 'ranking' || key === 'attendance' || key === 'name') {
      setSortBy(key)
    }
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      nationalParty: '',
      epGroup: '',
    })
  }

  return {
    filteredList,
    handleSearchChange,
    filters,
    handleNationalPartyChange,
    handleEpGroupChange,
    hasActiveFilters,
    clearFilters,
    sortBy,
    handleSortBy,
  }
}
