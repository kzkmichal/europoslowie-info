'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from './ui/button'

type VotesFilterProps = {
  year?: number
  month?: number
  result?: 'ADOPTED' | 'REJECTED'
}

export const VotesFilter = ({ year, month, result }: VotesFilterProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

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

  const hasActiveFilters = !!(year || month || result)

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
    router.push(`${pathname}`)
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Select
        value={year ? `${year}` : '__all__'}
        onValueChange={(value) => updateFilters('year', value)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Rok" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Wszystkie lata</SelectItem>
          {years.map((y) => (
            <SelectItem key={y} value={`${y}`}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={month ? `${month}` : '__all__'}
        onValueChange={(value) => updateFilters('month', value)}
        disabled={!year}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Miesiąc" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Wszystkie miesiące</SelectItem>
          {months.map((m) => (
            <SelectItem key={m.value} value={`${m.value}`}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={result ? `${result}` : '__all__'}
        onValueChange={(value) => updateFilters('result', value)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Wynik" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Wszystkie</SelectItem>
          <SelectItem value="ADOPTED">Przyjęte</SelectItem>
          <SelectItem value="REJECTED">Odrzucone</SelectItem>
        </SelectContent>
      </Select>
      {hasActiveFilters && (
        <Button size="sm" variant="outline" onClick={clearFilters}>
          Wyczyść filtry
        </Button>
      )}
    </div>
  )
}
