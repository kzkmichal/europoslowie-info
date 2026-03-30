import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const toMonthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, '0')}`
