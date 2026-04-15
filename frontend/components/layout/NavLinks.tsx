'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/europoslowie', label: 'Europosłowie' },
  { href: '/glosowania', label: 'Głosowania' },
  { href: '/metodologia', label: 'Metodologia' },
  { href: '/o-projekcie', label: 'O projekcie' },
]

export const NavLinks = () => {
  const pathname = usePathname()

  return (
    <nav className="hidden md:flex items-center gap-8">
      {links.map(({ href, label }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={
              isActive
                ? 'relative font-display font-bold tracking-tight text-sm text-primary before:absolute before:-bottom-1 before:left-0 before:w-full before:h-0.5 before:bg-primary'
                : 'relative font-display font-bold tracking-tight text-sm text-on-surface-variant hover:text-primary transition-colors'
            }
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
