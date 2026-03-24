import { Suspense } from 'react'
import { getAllMEPsWithStats } from '@/lib/db/queries'
import { Container } from '@/components/layout/Container'
import { MEPGrid } from '@/components/meps/MEPGrid'

export function generateMetadata() {
  const metadata = {
    title: 'Polscy Europosłowie - Lista posłów w PE | Europosłowie.info',
    description:
      'Pełna lista 53 polskich europosłów w Parlamencie Europejskim. Sprawdź statystyki obecności, głosowania i aktywność każdego posła.',
  }

  return metadata
}
export default async function HomePage() {
  const meps = await getAllMEPsWithStats()

  return (
    <div className="py-8">
      <Container>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-on-surface">
            Polscy Europosłowie
          </h1>
          <p className="mt-2 text-lg text-on-surface-variant">
            10. Kadencja Parlamentu Europejskiego (2024-2029)
          </p>
          <p className="mt-1 text-sm text-outline">
            Monitorujemy aktywność {meps.length} polskich posłów
          </p>
        </div>
        <Suspense fallback={<div className="py-8 text-center text-on-surface-variant">Ładowanie...</div>}>
          <MEPGrid meps={meps} />
        </Suspense>
        {meps.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-600">Brak danych o posłach</p>
          </div>
        )}
      </Container>
    </div>
  )
}

// Revalidate every 24 hours
export const revalidate = 86400
