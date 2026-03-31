export { MONTHS_PL } from '@/lib/constants'

export const getAttendance = (
  rate: number,
): { label: string; color: string } => {
  if (rate >= 90) return { label: 'Wysoka', color: 'var(--primary-container)' }
  if (rate >= 70) return { label: 'Średnia', color: 'var(--attendance-medium)' }
  return { label: 'Niska', color: 'var(--error)' }
}

export const statLabel =
  'text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant font-display'
export const divider = { borderBottom: '1px solid rgba(196,198,209,0.20)' }
