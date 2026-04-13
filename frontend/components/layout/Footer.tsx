import Link from 'next/link'
import { Container } from '@/components/layout/Container'

export const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full border-t border-outline-variant bg-surface-container-low">
      <Container>
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
            <div className="md:col-span-4">
              <div className="text-2xl font-bold tracking-tighter text-primary font-display mb-6">
                Europoslowie.info
              </div>
              <p className="text-on-surface-variant text-sm leading-relaxed max-w-sm">
                Niezależna platforma monitorująca pracę polskich przedstawicieli
                w Parlamencie Europejskim. Budujemy świadome społeczeństwo
                obywatelskie poprzez dane.
              </p>
            </div>
            <div className="md:col-span-3">
              <h4 className="font-display font-bold text-primary text-sm tracking-wide mb-6 uppercase">
                Nawigacja
              </h4>
              <ul className="space-y-4">
                <li>
                  <Link
                    href="/"
                    className="text-on-surface-variant hover:text-primary transition-colors text-xs"
                  >
                    Europosłowie
                  </Link>
                </li>
                <li>
                  <Link
                    href="/glosowania"
                    className="text-on-surface-variant hover:text-primary transition-colors text-xs"
                  >
                    Głosowania
                  </Link>
                </li>
                <li>
                  <Link
                    href="/metodologia"
                    className="text-on-surface-variant hover:text-primary transition-colors text-xs"
                  >
                    Metodologia
                  </Link>
                </li>
                <li>
                  <Link
                    href="/o-projekcie"
                    className="text-on-surface-variant hover:text-primary transition-colors text-xs"
                  >
                    O projekcie
                  </Link>
                </li>
              </ul>
            </div>
            <div className="md:col-span-5">
              <h4 className="font-display font-bold text-primary text-sm tracking-wide mb-6 uppercase">
                O projekcie
              </h4>
              <ul className="space-y-4 mb-6">
                <li>
                  <a
                    href="https://github.com/kzkmichal/europrojekt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-on-surface-variant hover:text-primary transition-colors text-xs"
                  >
                    Kod źródłowy na GitHub
                  </a>
                </li>
                <li className="text-on-surface-variant text-xs">
                  Ostatnia aktualizacja danych: marzec 2026
                </li>
              </ul>
              <p className="text-on-surface-variant text-xs leading-relaxed">
                Dane pobierane z oficjalnego API Parlamentu Europejskiego.
                Serwis nie jest powiązany z instytucjami UE ani żadną partią
                polityczną.
              </p>
            </div>
          </div>
          <div className="pt-8 border-t border-outline-variant/60 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-on-surface-variant">
              © {currentYear} Europoslowie.info
            </p>
            <p className="text-xs text-on-surface-variant">
              Dane źródłowe:{' '}
              <a
                href="https://www.europarl.europa.eu"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Parlament Europejski (Open Data)
              </a>
            </p>
          </div>
        </div>
      </Container>
    </footer>
  )
}
