import { getAllMEPsWithStats } from '@/lib/db/queries'
import { Container } from '@/components/Container'
import { MEPGrid } from '@/components/MEPGrid'

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
          <h1 className="text-3xl font-bold text-gray-900">
            Polscy Europosłowie
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            10. Kadencja Parlamentu Europejskiego (2024-2029)
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Monitorujemy aktywność {meps.length} polskich posłów
          </p>
        </div>
        <MEPGrid meps={meps} />
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
