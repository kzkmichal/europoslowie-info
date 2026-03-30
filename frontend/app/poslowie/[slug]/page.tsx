import {
  getMepBySlug,
  getMepMonthList,
  getMepActivityMonthList,
  getMepVotesByMonth,
  getMepSpeechesBySession,
  getMepQuestionsBySession,
  getMepDocuments,
} from '@/lib/db/queries'
import { notFound } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import type { Metadata } from 'next'
import { ProfileHeader } from '@/components/meps/profile/ProfileHeader'
import { ProfileTabs } from '@/components/meps/profile/ProfileTabs'
import { ProfileTab } from '@/components/meps/profile/ProfileTab'
import { VotesTab } from '@/components/meps/profile/VotesTab'
import { ActivityTab } from '@/components/meps/profile/ActivityTab'
import { DocumentsTab } from '@/components/meps/profile/DocumentsTab'

export type PageParams = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { slug } = await params
  const mep = await getMepBySlug(slug)

  if (!mep) {
    return {
      title: 'Poseł nie znaleziony | Europosłowie.info',
    }
  }

  return {
    title: `${mep.fullName} - Profil posła | Europosłowie.info`,
    description: `Profil ${mep.fullName} (${
      mep.nationalParty || 'niezależny'
    }, ${
      mep.epGroup || 'brak grupy'
    }). Statystyki obecności, głosowania i aktywność w Parlamencie Europejskim.`,
  }
}

export default async function MEPProfilePage({
  params,
  searchParams,
}: PageParams) {
  const { slug } = await params
  const { month, tab } = await searchParams

  const monthParam = typeof month === 'string' ? month : undefined
  const activeTab =
    typeof tab === 'string' &&
    ['profile', 'votes', 'activity', 'documents'].includes(tab)
      ? tab
      : 'profile'

  const [mep, monthList, activityMonthList, mepDocs] = await Promise.all([
    getMepBySlug(slug),
    getMepMonthList(slug),
    getMepActivityMonthList(slug),
    getMepDocuments(slug),
  ])

  if (!mep) {
    notFound()
  }

  let currentYear: number
  let currentMonth: number
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split('-').map(Number)
    currentYear = y
    currentMonth = m
  } else {
    currentYear = monthList[0]?.year ?? new Date().getFullYear()
    currentMonth = monthList[0]?.month ?? new Date().getMonth() + 1
  }

  const monthStart = new Date(currentYear, currentMonth - 1, 1)
  const monthEnd = new Date(currentYear, currentMonth, 0)

  const tabContentLayout: Record<string, () => Promise<React.ReactNode>> = {
    profile: async () => <ProfileTab mep={mep} docs={mepDocs} />,
    votes: async () => {
      const votes = await getMepVotesByMonth(slug, currentYear, currentMonth)
      return (
        <VotesTab
          monthList={monthList}
          votes={votes}
          currentYear={currentYear}
          currentMonth={currentMonth}
          slug={slug}
        />
      )
    },
    activity: async () => {
      const [sessionSpeeches, sessionQuestions] = await Promise.all([
        getMepSpeechesBySession(slug, monthStart, monthEnd),
        getMepQuestionsBySession(slug, monthStart, monthEnd),
      ])
      return (
        <ActivityTab
          monthList={activityMonthList}
          speeches={sessionSpeeches}
          questions={sessionQuestions}
          currentYear={currentYear}
          currentMonth={currentMonth}
          slug={slug}
        />
      )
    },
    documents: async () => <DocumentsTab documents={mepDocs} />,
  }

  const tabContent = await (tabContentLayout[activeTab] ?? tabContentLayout.profile)()

  return (
    <div className="py-8">
      <Container>
        <ProfileHeader mep={mep} docsCount={mepDocs.length} />
        <ProfileTabs slug={slug} activeTab={activeTab} month={monthParam} />
        {tabContent}
      </Container>
    </div>
  )
}

export const revalidate = 86400
