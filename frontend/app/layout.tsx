import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { inter } from './fonts'

export const metadata: Metadata = {
  title: 'Europosłowie.info - Monitoruj polskich posłów w PE',
  description:
    'Platforma transparentności politycznej monitorująca aktywność 53 polskich europosłów w Parlamencie Europejskim. Statystyki, głosowania, obecność.',
  keywords: [
    'europosłowie',
    'parlament europejski',
    'polscy posłowie',
    'PE',
    'głosowania',
    'statystyki',
  ],
  authors: [{ name: 'Europosłowie.info' }],
  openGraph: {
    title: 'Europosłowie.info',
    description: 'Monitoruj aktywność polskich europosłów w PE',
    url: 'https://europoslowie.info',
    siteName: 'Europosłowie.info',
    locale: 'pl_PL',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pl" className="h-full">
      <body
        className={`${inter.className} flex min-h-full flex-col bg-gray-50`}
      >
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
