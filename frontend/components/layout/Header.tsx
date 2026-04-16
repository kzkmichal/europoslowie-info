'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Container } from '@/components/layout/Container'

const links = [
  { href: '/europoslowie', label: 'Europosłowie' },
  { href: '/glosowania', label: 'Głosowania' },
  { href: '/metodologia', label: 'Metodologia' },
  { href: '/o-projekcie', label: 'O projekcie' },
]

export const Header = () => {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const linkClass = (href: string) =>
    pathname.startsWith(href)
      ? 'relative font-display font-bold tracking-tight text-sm text-primary before:absolute before:-bottom-1 before:left-0 before:w-full before:h-0.5 before:bg-primary'
      : 'relative font-display font-bold tracking-tight text-sm text-on-surface-variant hover:text-primary transition-colors'

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

          <nav className="hidden md:flex items-center gap-8">
            {links.map(({ href, label }) => (
              <Link key={href} href={href} className={linkClass(href)}>
                {label}
              </Link>
            ))}
          </nav>

          <button
            className="md:hidden p-2 -mr-2 text-on-surface-variant hover:text-primary transition-colors"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Zamknij menu' : 'Otwórz menu'}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      {open && (
        <div className="md:hidden bg-surface-container-lowest border-t border-outline-variant/15">
          <Container>
            <nav className="flex flex-col py-2">
              {links.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`py-3 border-b border-outline-variant/10 last:border-0 font-display font-bold text-sm ${
                    pathname.startsWith(href)
                      ? 'text-primary'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </Container>
        </div>
      )}

      <div className="bg-outline-variant h-px opacity-15" />
    </header>
  )
}
