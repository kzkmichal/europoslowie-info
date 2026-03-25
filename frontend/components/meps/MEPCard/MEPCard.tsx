import Link from 'next/link'
import type { MEPWithStats, BaseProps } from '@/lib/types'
import { cn } from '@/lib/utils'
import { MEPCardHeader } from './compoents/MEPCardHeader'
import { MEPCardStats } from './compoents/MEPCardStats'

type MEPCardProps = BaseProps & { mep: MEPWithStats }

export const MEPCard = ({ mep, className, 'data-testid': dataTestId, 'data-cc': dataCc, id }: MEPCardProps) => {
  return (
    <Link
      href={`/poslowie/${mep.slug}`}
      className={cn(
        'block bg-surface-container-lowest rounded-xl p-4',
        'shadow-[0_12px_32px_-4px_rgba(25,28,29,0.04)]',
        'hover:shadow-[0_16px_40px_-4px_rgba(25,28,29,0.10)] hover:-translate-y-0.5',
        'transition-all duration-200',
        className,
      )}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      <MEPCardHeader mep={mep} />
      {mep.latestStats
        ? <MEPCardStats stats={mep.latestStats} />
        : <div className="text-sm text-outline">Brak statystyk</div>
      }
    </Link>
  )
}
