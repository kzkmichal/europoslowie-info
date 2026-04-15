import type { LastSessionData } from '@/lib/types'
import Link from 'next/link'
import { SessionBlock } from '@/components/sessions/SessionBlock'

type LastSessionCardProps = { session: LastSessionData }

export const LastSessionCard = ({ session }: LastSessionCardProps) => {
  if (!session || !session.sessions.length) {
    return (
      <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-ambient flex items-center justify-center min-h-40">
        <p className="text-on-surface-variant text-sm">Brak danych o sesjach</p>
      </div>
    )
  }

  const { sessions } = session

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-ambient flex flex-col h-full">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-primary rounded-full shrink-0" />
          <div>
            <h3 className="font-display text-2xl font-black text-primary tracking-tight leading-tight">
              Sesje w ostatnim miesiącu
            </h3>
          </div>
        </div>
        <Link
          href="/glosowania"
          className="inline-flex items-center gap-1.5 text-[11px] font-black text-primary uppercase hover:bg-surface-container-low px-4 py-2 rounded-lg transition-all tracking-wider shrink-0"
        >
          Pełny raport ↗
        </Link>
      </div>
      <div
        className={`grid gap-4 grow ${sessions.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}
      >
        {sessions.map((session, i) => (
          <SessionBlock key={i} {...session} />
        ))}
      </div>
    </div>
  )
}
