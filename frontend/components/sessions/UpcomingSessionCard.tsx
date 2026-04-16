import type { UpcomingSessionData } from '@/lib/types'
import { MONTHS_PL, DAY_FULL_PL } from '@/lib/constants'

const formatDayRange = (start: Date, end: Date): string => {
  if (start.toDateString() === end.toDateString())
    return DAY_FULL_PL[start.getDay()]
  return `${DAY_FULL_PL[start.getDay()]} – ${DAY_FULL_PL[end.getDay()]}`
}

const formatDateNumericRange = (start: Date, end: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0')
  const sd = `${p(start.getDate())}.${p(start.getMonth() + 1)}`
  const ed = `${p(end.getDate())}.${p(end.getMonth() + 1)}.${end.getFullYear()}`
  if (start.toDateString() === end.toDateString())
    return `${sd}.${end.getFullYear()}`
  return `${sd} – ${ed}`
}

type UpcomingSessionProps = { session: UpcomingSessionData }

export const UpcomingSessionCard = ({ session }: UpcomingSessionProps) => {
  if (!session || !session.sessions.length) {
    return (
      <div className="bg-primary rounded-2xl p-6 flex flex-col gap-3 min-h-40 shadow-xl">
        <span className="text-[10px] font-black tracking-[0.2em] text-primary-foreground/40 uppercase">
          Kalendarz prac
        </span>
        <h3 className="font-display text-2xl font-black text-primary-foreground tracking-tight">
          Nadchodząca sesja
        </h3>
        <p className="text-sm text-primary-foreground/50">
          Brak zaplanowanej sesji
        </p>
      </div>
    )
  }

  const { sessions } = session
  const first = sessions[0]

  return (
    <div className="bg-primary rounded-2xl p-6 text-primary-foreground shadow-xl flex flex-col justify-between relative overflow-hidden group">
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary-foreground/5 rounded-full blur-3xl group-hover:bg-primary-foreground/10 transition-all duration-700 pointer-events-none" />

      <div className="relative">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-[10px] font-black tracking-[0.2em] text-primary-foreground/50 uppercase mb-1">
              Kalendarz prac
            </div>
            <h3 className="font-display text-2xl font-black text-primary-foreground tracking-tight">
              Nadchodząca sesja
            </h3>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {sessions.map((s, i) => (
            <div key={i} className="flex gap-4 items-center">
              <div className="shrink-0 w-20 h-20 bg-primary-foreground/5 border border-primary-foreground/10 rounded-2xl flex flex-col items-center justify-center gap-0.5">
                <span className="text-[9px] font-black uppercase tracking-tighter text-primary-foreground/50 leading-none">
                  {MONTHS_PL[s.startDate.getMonth()]}
                </span>
                <span className="font-display text-3xl font-black text-primary-foreground leading-none">
                  {s.startDate.getDate()}
                </span>
              </div>
              <div className="flex-grow">
                <div className="font-display text-xl font-bold text-primary-foreground mb-1">
                  {formatDayRange(s.startDate, s.endDate)}
                </div>
                <div className="text-sm text-primary-foreground/60">
                  {formatDateNumericRange(s.startDate, s.endDate)}
                </div>
              </div>
            </div>
          ))}

          {(first.location || first.sessionType) && (
            <div className="bg-primary-foreground/5 border border-primary-foreground/10 p-5 rounded-2xl">
              <div className="flex items-center gap-3">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary-foreground/40 shrink-0"
                >
                  <path d="M12 21s-8-7.3-8-12a8 8 0 0116 0c0 4.7-8 12-8 12z" />
                  <circle cx="12" cy="9" r="2" />
                </svg>
                <span className="text-sm font-black tracking-wide uppercase text-primary-foreground/80">
                  {[first.location, first.sessionType]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <a
        href="https://www.europarl.europa.eu/plenary/pl/agendas.html"
        target="_blank"
        rel="noopener noreferrer"
        className="relative inline-flex items-center gap-2 mt-12 font-black text-xs uppercase tracking-widest text-primary-foreground hover:text-primary-foreground transition-colors group/link"
      >
        Przejdź do agendy
        <span className="transition-transform group-hover/link:translate-x-1 ">
          →
        </span>
      </a>
    </div>
  )
}
