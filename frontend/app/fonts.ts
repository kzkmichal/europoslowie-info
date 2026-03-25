import { Inter, Public_Sans } from 'next/font/google'

export const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
})

export const publicSans = Public_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-public-sans',
})
