import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { NavLinks } from '@/components/layout/NavLinks'

export const Header = () => {
  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-md shadow-sm">
      <Container>
        <div className="flex justify-between items-center py-4">
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-tighter text-primary"
          >
            Europosłowie.info
          </Link>
          <NavLinks />
        </div>
      </Container>
      <div className="bg-outline-variant h-px opacity-15" />
    </header>
  )
}
