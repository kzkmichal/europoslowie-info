import {
  getMepBySlug,
  getMepMonthList,
  getMepActivityMonthList,
  getMepVotesByMonth,
  getMepSpeechesBySession,
  getMepQuestionsBySession,
  getMepDocuments,
  getAllMepSlugs,
} from '@/lib/db/queries'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Container } from '@/components/layout/Container'
import type { Metadata } from 'next'
import { ProfileHeader } from '@/components/meps/profile/ProfileHeader'
import { ProfileTabs } from '@/components/meps/profile/ProfileTabs'
import { ProfileTab } from '@/components/meps/profile/ProfileTab'
import { VotesTab } from '@/components/meps/profile/VotesTab'
import { ActivityTab } from '@/components/meps/profile/ActivityTab'
import { DocumentsTab } from '@/components/meps/profile/DocumentsTab'

export async function generateStaticParams() {
  const slugs = await getAllMepSlugs()
  return slugs.map(({ slug }) => ({ slug }))
}

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
      title: 'Poseł nie znaleziony',
    }
  }

  return {
    title: `${mep.fullName} — Profil posła`,
    description: `Profil ${mep.fullName} (${
      mep.nationalParty || 'niezależny'
    }, ${
      mep.epGroup || 'brak grupy'
    }). Statystyki obecności, głosowania i aktywność w Parlamencie Europejskim.`,
    alternates: { canonical: `https://europoslowie.pl/poslowie/${slug}` },
    openGraph: {
      title: mep.fullName,
      description: `${mep.nationalParty ?? 'niezależny'} · ${mep.epGroup ?? ''} · Statystyki głosowań i aktywności`,
      url: `https://europoslowie.pl/poslowie/${slug}`,
      type: 'profile',
      firstName: mep.firstName ?? undefined,
      lastName: mep.lastName ?? undefined,
      images: mep.photoUrl
        ? [{ url: mep.photoUrl, width: 96, height: 96, alt: mep.fullName }]
        : undefined,
      locale: 'pl_PL',
      siteName: 'Europosłowie.info',
    },
    twitter: {
      card: mep.photoUrl ? 'summary_large_image' : 'summary',
      title: mep.fullName,
      description: `${mep.nationalParty ?? ''} · ${mep.epGroup ?? ''}`,
      images: mep.photoUrl ? [mep.photoUrl] : undefined,
    },
  }
}

type TabContentProps = {
  slug: string
  activeTab: string
  monthParam: string | undefined
  mep: NonNullable<Awaited<ReturnType<typeof getMepBySlug>>>
  mepDocs: Awaited<ReturnType<typeof getMepDocuments>>
}

const TabContent = async ({
  slug,
  activeTab,
  monthParam,
  mep,
  mepDocs,
}: TabContentProps) => {
  if (activeTab === 'profile') return <ProfileTab mep={mep} docs={mepDocs} />
  if (activeTab === 'documents') return <DocumentsTab documents={mepDocs} />

  const [monthList, activityMonthList] = await Promise.all([
    getMepMonthList(slug),
    getMepActivityMonthList(slug),
  ])

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

  if (activeTab === 'votes') {
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
  }

  const monthStart = new Date(currentYear, currentMonth - 1, 1)
  const monthEnd = new Date(currentYear, currentMonth, 0)
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

  const [mep, mepDocs] = await Promise.all([
    getMepBySlug(slug),
    getMepDocuments(slug),
  ])

  if (!mep) {
    notFound()
  }

  return (
    <div className="py-8">
      <Container>
        <ProfileHeader mep={mep} docsCount={mepDocs.length} />
        <ProfileTabs slug={slug} activeTab={activeTab} month={monthParam} />
        <Suspense
          fallback={
            <div className="py-8 text-center text-on-surface-variant">
              Ładowanie...
            </div>
          }
        >
          <TabContent
            slug={slug}
            activeTab={activeTab}
            monthParam={monthParam}
            mep={mep}
            mepDocs={mepDocs}
          />
        </Suspense>
      </Container>
    </div>
  )
}

export const revalidate = 86400
