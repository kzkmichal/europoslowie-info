import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { cn } from '@/lib/utils'

const navLinkStyles = cn(
  'text-sm font-medium text-on-surface-variant',
  'transition-colors hover:text-primary',
)

export function Header() {
  return (
    <header className="sticky top-0 z-50 glass border-b border-outline-variant/15">
      <Container>
        <nav className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-tight text-primary"
          >
            Europosłowie.info
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className={navLinkStyles}>
              Posłowie
            </Link>
            <Link href="/glosowania" className={navLinkStyles}>
              Głosowania
            </Link>
            <Link href="/metodologia" className={navLinkStyles}>
              Metodologia
            </Link>
            <Link href="/o-projekcie" className={navLinkStyles}>
              O projekcie
            </Link>
          </div>
        </nav>
      </Container>
    </header>
  )
}
