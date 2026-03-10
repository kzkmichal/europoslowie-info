import Link from 'next/link'
import { Container } from './Container'
import { cn } from '@/lib/utils'

const navLinkStyles = cn(
  'text-sm font-medium text-gray-700',
  'transition-colors hover:text-blue-600',
)

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <Container>
        <nav className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-blue-600">
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
