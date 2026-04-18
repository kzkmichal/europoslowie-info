import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { inter, publicSans } from './fonts'

export const metadata: Metadata = {
  metadataBase: new URL('https://europoslowie.pl'),
  title: {
    default: 'Europosłowie.pl — Monitoruj polskich posłów w PE',
    template: '%s | Europosłowie.pl',
  },
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
  authors: [{ name: 'Europosłowie.pl' }],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    title: 'Europosłowie.pl',
    description: 'Monitoruj aktywność polskich europosłów w PE',
    url: 'https://europoslowie.pl',
    siteName: 'Europosłowie.pl',
    locale: 'pl_PL',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Europosłowie.pl',
    description: 'Monitoruj aktywność polskich europosłów w PE',
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
        className={`${inter.variable} ${publicSans.variable} font-sans flex min-h-full flex-col bg-surface`}
      >
        <Header />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
