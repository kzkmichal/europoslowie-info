export const MONTHS_PL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

export const getAttendance = (rate: number): { label: string; color: string } => {
  if (rate >= 90) return { label: 'Wysoka', color: '#4c5e84' }
  if (rate >= 70) return { label: 'Średnia', color: '#d97706' }
  return { label: 'Niska', color: '#ba1a1a' }
}

export const statLabel = 'text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant font-display'
export const divider = { borderBottom: '1px solid rgba(196,198,209,0.20)' }
