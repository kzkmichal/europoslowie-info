import { getAllMEPsWithStats, getLastSession, getNextSession, getSiteStats } from '@/lib/db/queries'
import { Container } from '@/components/layout/Container'
import { HeroSection } from '@/components/home/HeroSection'
import { StatsCard } from '@/components/home/StatsCard'
import { TrackedCard } from '@/components/home/TrackedCard'
import { LastSessionCard } from '@/components/sessions/LastSessionCard'
import { UpcomingSessionCard } from '@/components/sessions/UpcomingSessionCard'

export const generateMetadata = () => ({
  title: { absolute: 'Europosłowie.info — Monitoring aktywności polskich europosłów' },
  description:
    'Przejrzysta platforma monitorująca aktywność, głosowania i obecność polskich posłów w Parlamencie Europejskim.',
  openGraph: { url: 'https://europoslowie.pl' },
})

export default async function HomePage() {
  const [meps, lastSession, nextSession, stats] = await Promise.all([
    getAllMEPsWithStats(),
    getLastSession(),
    getNextSession(),
    getSiteStats(),
  ])

  return (
    <div>
      <HeroSection />

      <section className="pb-12">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <StatsCard mepsCount={meps.length} stats={stats} />
            <TrackedCard />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LastSessionCard session={lastSession} />
            <UpcomingSessionCard session={nextSession} />
          </div>
        </Container>
      </section>
    </div>
  )
}

export const revalidate = 86400
