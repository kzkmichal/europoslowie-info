import Link from 'next/link'
import { Container } from '@/components/layout/Container'

export const HeroSection = () => (
  <section className="py-12 md:py-16">
    <Container>
      <h1 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-on-surface tracking-tighter leading-tight mb-5">
        Analityczne spojrzenie na{' '}
        <span className="text-primary">Parlament Europejski</span>
      </h1>
      <p className="text-lg sm:text-xl text-on-surface-variant max-w-2xl leading-relaxed mb-8">
        Zapewniamy dostęp do rzetelnych danych o aktywności polskich
        europarlamentarzystów. Przejrzystość to fundament nowoczesnej
        demokracji.
      </p>
      <div className="flex gap-3 flex-wrap">
        <Link
          href="/europoslowie"
          className="px-5 py-3 sm:px-8 sm:py-4 bg-primary text-primary-foreground rounded-sm font-display font-bold tracking-wide hover:opacity-90 transition-opacity"
        >
          Sprawdź europosłów
        </Link>
        <Link
          href="/glosowania"
          className="px-5 py-3 sm:px-8 sm:py-4 bg-secondary-container text-on-secondary-container rounded-sm font-display font-bold tracking-wide hover:opacity-90 transition-opacity"
        >
          Zobacz głosowania
        </Link>
      </div>
    </Container>
  </section>
)
