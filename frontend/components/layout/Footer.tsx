import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { cn } from '@/lib/utils'

const footerLinkStyles = cn(
  'text-on-surface-variant',
  'transition-colors hover:text-primary'
)

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto bg-surface-container-low">
      <Container>
        <div className="py-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div>
              <h3 className="font-display mb-3 text-sm font-semibold text-on-surface">
                O projekcie
              </h3>
              <p className="text-sm text-on-surface-variant">
                Platforma monitorująca aktywność 53 polskich europosłów w
                Parlamencie Europejskim.
              </p>
            </div>
            <div>
              <h3 className="font-display mb-3 text-sm font-semibold text-on-surface">
                Nawigacja
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/" className={footerLinkStyles}>
                    Posłowie
                  </Link>
                </li>
                <li>
                  <Link href="/top-glosowania" className={footerLinkStyles}>
                    Top głosowania
                  </Link>
                </li>
                <li>
                  <Link href="/metodologia" className={footerLinkStyles}>
                    Metodologia
                  </Link>
                </li>
                <li>
                  <Link href="/o-projekcie" className={footerLinkStyles}>
                    O projekcie
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-display mb-3 text-sm font-semibold text-on-surface">
                Informacje
              </h3>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                <li>Dane: Parlament Europejski</li>
                <li>Ostatnia aktualizacja: Grudzień 2024</li>
                <li>
                  <a
                    href="https://github.com/yourusername/europoslowie-info"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={footerLinkStyles}
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(196,199,208,0.3)' }}>
            <p className="text-center text-sm text-on-surface-variant">
              © {currentYear} Europosłowie.info. Dane publiczne z Parlamentu
              Europejskiego.
            </p>
          </div>
        </div>
      </Container>
    </footer>
  )
}
