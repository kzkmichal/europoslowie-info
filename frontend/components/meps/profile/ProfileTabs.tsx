import Link from 'next/link'

const TABS = [
  { id: 'profile', label: 'Profil' },
  { id: 'votes', label: 'Głosowania' },
  { id: 'activity', label: 'Aktywność' },
  { id: 'documents', label: 'Dokumenty' },
]

type ProfileTabsProps = {
  slug: string
  activeTab: string
  month?: string
}

export const ProfileTabs = ({ slug, activeTab, month }: ProfileTabsProps) => {
  const buildHref = (tabId: string) => {
    const params = new URLSearchParams()
    params.set('tab', tabId)
    if (month && (tabId === 'votes' || tabId === 'activity')) {
      params.set('month', month)
    }
    return `/poslowie/${slug}?${params.toString()}`
  }

  return (
    <nav className="border-b border-outline-variant mb-6">
      <div className="flex">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={buildHref(tab.id)}
            className={
              activeTab === tab.id
                ? 'border-b-2 border-primary px-4 py-3 text-sm font-bold uppercase tracking-widest text-primary'
                : 'border-b-2 border-transparent px-4 py-3 text-sm font-medium uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors'
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
