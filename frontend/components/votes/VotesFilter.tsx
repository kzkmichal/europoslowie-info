'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '../ui/input'
import { useDebounce } from '@/hooks/useDebounce'
import { useEffect, useState } from 'react'

type VotesFilterProps = {
  year?: number
  month?: number
  search?: string
  result?: 'ADOPTED' | 'REJECTED'
  topic?: string
  topics?: string[]
}

const filterTriggerClass =
  'h-10 border border-outline-variant/50 bg-surface-container-lowest rounded-lg px-3 gap-1.5 shadow-none text-sm font-bold text-primary hover:bg-surface-container-low transition-colors [&_[data-slot=select-value]]:font-bold [&_[data-slot=select-value]]:text-primary'

const filterLabel = (text: string) => (
  <span className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/50 font-display shrink-0">
    {text}
  </span>
)

export const VotesFilter = ({
  year,
  month,
  result,
  search,
  topic,
  topics = [],
}: VotesFilterProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState(search ?? '')
  const debouncedSearch = useDebounce(300, searchInput)

  const years = [2024, 2025, 2026]
  const months = [
    { value: 1, label: 'Styczeń' },
    { value: 2, label: 'Luty' },
    { value: 3, label: 'Marzec' },
    { value: 4, label: 'Kwiecień' },
    { value: 5, label: 'Maj' },
    { value: 6, label: 'Czerwiec' },
    { value: 7, label: 'Lipiec' },
    { value: 8, label: 'Sierpień' },
    { value: 9, label: 'Wrzesień' },
    { value: 10, label: 'Październik' },
    { value: 11, label: 'Listopad' },
    { value: 12, label: 'Grudzień' },
  ]

  const hasActiveFilters = !!(year || month || result || debouncedSearch || topic)

  useEffect(() => {
    if ((debouncedSearch || undefined) !== search) {
      updateFilters('search', debouncedSearch || '__all__')
    }
  }, [debouncedSearch])

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === '__all__') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    if (key === 'year') params.delete('month')
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearchInput('')
    router.push(`${pathname}`)
  }

  return (
    <div className="mb-6 space-y-3">
      <Input
        value={searchInput ?? ''}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Szukaj głosowania..."
        className="w-full h-10 border-outline-variant/50 bg-surface-container-lowest placeholder:text-on-surface-variant/40"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={year ? `${year}` : '__all__'}
          onValueChange={(value) => updateFilters('year', value)}
        >
          <SelectTrigger className={filterTriggerClass}>
            {filterLabel('Rok')}
            <SelectValue placeholder="Wszystkie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Wszystkie lata</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={`${y}`}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={month ? `${month}` : '__all__'}
          onValueChange={(value) => updateFilters('month', value)}
          disabled={!year}
        >
          <SelectTrigger className={filterTriggerClass}>
            {filterLabel('Miesiąc')}
            <SelectValue placeholder="Wszystkie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Wszystkie miesiące</SelectItem>
            {months.map((m) => (
              <SelectItem key={m.value} value={`${m.value}`}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={result ? `${result}` : '__all__'}
          onValueChange={(value) => updateFilters('result', value)}
        >
          <SelectTrigger className={filterTriggerClass}>
            {filterLabel('Wynik')}
            <SelectValue placeholder="Każdy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Każdy</SelectItem>
            <SelectItem value="ADOPTED">Przyjęte</SelectItem>
            <SelectItem value="REJECTED">Odrzucone</SelectItem>
          </SelectContent>
        </Select>

        {topics.length > 0 && (
          <Select
            value={topic ?? '__all__'}
            onValueChange={(value) => updateFilters('topic', value)}
          >
            <SelectTrigger className={filterTriggerClass}>
              {filterLabel('Kategoria')}
              <SelectValue placeholder="Wszystkie tematy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Wszystkie tematy</SelectItem>
              {topics.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="ml-auto flex items-center gap-2">
          {hasActiveFilters && (
            <Button size="sm" variant="outline" onClick={clearFilters}>
              Wyczyść
            </Button>
          )}
          <Button
            size="sm"
            className="bg-primary text-white font-display font-black uppercase tracking-wider hover:bg-primary/90"
            onClick={() => router.push(`${pathname}?${searchParams.toString()}`)}
          >
            Filtruj wyniki
          </Button>
        </div>
      </div>
    </div>
  )
}
