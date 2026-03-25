import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type PaginationProps = {
  page: number
  totalPages: number
  buildUrl: (page: number) => string
}

const getPageNumbers = (current: number, total: number): (number | '...')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3)
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total]

  return [1, '...', current - 1, current, current + 1, '...', total]
}

const pageItemClass =
  'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors'

export const Pagination = ({ page, totalPages, buildUrl }: PaginationProps) => {
  if (totalPages <= 1) return null

  const pages = getPageNumbers(page, totalPages)

  return (
    <nav className="flex items-center justify-center gap-1 mt-10">
      {page > 1 ? (
        <Link
          href={buildUrl(page - 1)}
          className={cn(
            pageItemClass,
            'text-on-surface-variant hover:bg-surface-container-low',
          )}
          aria-label="Poprzednia strona"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
      ) : (
        <span
          className={cn(pageItemClass, 'text-outline/40 cursor-not-allowed')}
        >
          <ChevronLeft className="w-4 h-4" />
        </span>
      )}
      {pages.map((p, i) =>
        p === '...' ? (
          <span
            key={`ellipsis-${i}`}
            className={cn(pageItemClass, 'text-outline/60 cursor-default')}
          >
            …
          </span>
        ) : p === page ? (
          <span key={p} className={cn(pageItemClass, 'bg-primary text-white')}>
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={buildUrl(p)}
            className={cn(
              pageItemClass,
              'text-on-surface hover:bg-surface-container-low',
            )}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link
          href={buildUrl(page + 1)}
          className={cn(
            pageItemClass,
            'text-on-surface-variant hover:bg-surface-container-low',
          )}
          aria-label="Następna strona"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <span
          className={cn(pageItemClass, 'text-outline/40 cursor-not-allowed')}
        >
          <ChevronRight className="w-4 h-4" />
        </span>
      )}
    </nav>
  )
}
