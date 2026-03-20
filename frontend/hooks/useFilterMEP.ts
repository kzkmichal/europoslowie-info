import { MEPWithStats } from '@/lib/types'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useDebounce } from './useDebounce'

export type UseFilterMEPProps = {
  initialList?: MEPWithStats[]
}

export const useFilterMEP = ({ initialList }: UseFilterMEPProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchInput, setSearchInput] = useState(
    () => searchParams.get('search') ?? '',
  )
  const debouncedSearch = useDebounce(300, searchInput)

  const nationalParty = searchParams.get('party') ?? ''
  const epGroup = searchParams.get('group') ?? ''
  const attendanceRange = searchParams.get('attendance') ?? ''
  const sortBy = (searchParams.get('sort') ?? 'ranking') as
    | 'ranking'
    | 'attendance'
    | 'name'

  useEffect(() => {
    const currentInUrl = searchParams.get('search') ?? ''
    if ((debouncedSearch ?? '') === currentInUrl) return

    const params = new URLSearchParams(searchParams.toString())
    if (debouncedSearch) {
      params.set('search', debouncedSearch)
    } else {
      params.delete('search')
    }
    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname
    router.replace(newUrl)
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname
    router.replace(newUrl)
  }

  const filteredList = useMemo(() => {
    return (initialList ?? [])
      .filter((mep) => {
        const matchesSearch = mep.fullName
          .toLowerCase()
          .includes(debouncedSearch?.toLowerCase() ?? '')
        const matchesParty =
          !nationalParty || mep.nationalParty === nationalParty
        const matchesGroup = !epGroup || mep.epGroup === epGroup

        const rate = mep.latestStats?.attendanceRate ?? 0
        const matchesAttendance =
          !attendanceRange ||
          (attendanceRange === 'high' && rate >= 90) ||
          (attendanceRange === 'medium' && rate >= 70 && rate < 90) ||
          (attendanceRange === 'low' && rate < 70)

        return (
          matchesSearch && matchesParty && matchesGroup && matchesAttendance
        )
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
    debouncedSearch,
    initialList,
    nationalParty,
    epGroup,
    attendanceRange,
    sortBy,
  ])

  const hasActiveFilters =
    searchInput !== '' ||
    nationalParty !== '' ||
    epGroup !== '' ||
    attendanceRange !== ''

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value)
  }

  const handleNationalPartyChange = (value: string) => {
    updateParam('party', value === '__all__' ? '' : value)
  }

  const handleEpGroupChange = (value: string) => {
    updateParam('group', value === '__all__' ? '' : value)
  }

  const handleAttendanceRangeChange = (value: string) => {
    updateParam('attendance', value === '__all__' ? '' : value)
  }

  const handleSortBy = (key: string) => {
    if (key === 'ranking' || key === 'attendance' || key === 'name') {
      updateParam('sort', key === 'ranking' ? '' : key)
    }
  }

  const clearFilters = () => {
    setSearchInput('')
    router.replace(pathname)
  }

  return {
    filteredList,
    handleSearchChange,
    filters: { search: searchInput, nationalParty, epGroup, attendanceRange },
    handleNationalPartyChange,
    handleEpGroupChange,
    handleAttendanceRangeChange,
    hasActiveFilters,
    clearFilters,
    sortBy,
    handleSortBy,
  }
}
