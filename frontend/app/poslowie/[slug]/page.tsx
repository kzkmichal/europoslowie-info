import {
  getMepBySlug,
  getMepMonthList,
  getMepVotesByMonth,
  getMepQuestions,
  getMepSpeeches,
  getMepSpeechesBySession,
  getMepQuestionsBySession,
  getMepDocuments,
} from '@/lib/db/queries'
import { notFound } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { StatsTable } from '@/components/meps/StatsTable'
import { VoteCard } from '@/components/votes/VoteCard'
import { CommitteeList } from '@/components/meps/CommitteeList'
import { QuestionsList } from '@/components/meps/QuestionsList'
import { SpeechesList } from '@/components/meps/SpeechesList'
import { DocumentsList } from '@/components/meps/DocumentsList'
import Image from 'next/image'
import type { Metadata } from 'next'
import VoteMonthNav from '@/components/meps/VoteMonthNav'
import { VoteRow } from '@/components/votes/VoteRow'
import type { MEPVote } from '@/lib/types'

export type PageParams = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({
  params,
  searchParams,
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

const MONTHS_PL = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
]

const DAY_NAMES_PL = ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.']

function groupByDay(votes: MEPVote[]): Map<string, MEPVote[]> {
  const map = new Map<string, MEPVote[]>()
  for (const vote of votes) {
    const key = vote.date.toISOString().slice(0, 10)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(vote)
  }
  return map
}

export default async function MEPProfilePage({
  params,
  searchParams,
}: PageParams) {
  const { slug } = await params
  const { month } = await searchParams
  const monthParam = typeof month === 'string' ? month : undefined

  const [mep, monthList, mepQuestions, mepSpeeches, mepDocs] = await Promise.all([
    getMepBySlug(slug),
    getMepMonthList(slug),
    getMepQuestions(slug),
    getMepSpeeches(slug),
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
  const monthEnd = new Date(currentYear, currentMonth, 0) // last day

  const [votes, sessionSpeeches, sessionQuestions] = await Promise.all([
    getMepVotesByMonth(slug, currentYear, currentMonth),
    getMepSpeechesBySession(slug, monthStart, monthEnd),
    getMepQuestionsBySession(slug, monthStart, monthEnd),
  ])

  const votesByDay = groupByDay(votes)

  return (
    <div className="py-8">
      <Container>
        <div className="mb-8">
          <div className="flex items-start gap-6">
            <div className="h-32 w-32 shrink-0 overflow-hidden rounded-lg bg-surface-container-high">
              {mep.photoUrl ? (
                <Image
                  src={mep.photoUrl}
                  alt={mep.fullName}
                  width={128}
                  height={128}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl font-bold text-on-surface-variant">
                  {mep.fullName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="font-display text-3xl font-bold text-on-surface">
                {mep.fullName}
              </h1>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-on-surface-variant">
                {mep.nationalParty && (
                  <div>
                    <span className="font-medium">Partia krajowa:</span>{' '}
                    {mep.nationalParty}
                  </div>
                )}
                {mep.epGroup && (
                  <div>
                    <span className="font-medium">Grupa EP:</span> {mep.epGroup}
                  </div>
                )}
              </div>
              {mep.committees.length > 0 && (
                <div className="mt-3 space-y-1">
                  {mep.committees.map((c) => (
                    <div key={c.id} className="flex items-baseline gap-2 text-sm">
                      <span className="shrink-0 rounded bg-surface-container-high px-1.5 py-0.5 text-xs font-mono font-semibold text-on-surface-variant">
                        {c.committeeCode}
                      </span>
                      <span className="text-on-surface">{c.committeeName}</span>
                      <span className="text-outline-variant">·</span>
                      <span className={
                        c.role === 'chair' ? 'text-tertiary font-medium' :
                        c.role === 'vice-chair' ? 'text-secondary font-medium' :
                        c.role === 'substitute' ? 'text-outline' :
                        'text-on-surface-variant'
                      }>
                        {c.role === 'member' && 'Członek'}
                        {c.role === 'chair' && 'Przewodniczący'}
                        {c.role === 'vice-chair' && 'Wiceprzewodniczący'}
                        {c.role === 'substitute' && 'Zastępca'}
                      </span>
                      {c.fromDate && (
                        <>
                          <span className="text-outline-variant">·</span>
                          <span className="text-xs text-outline">
                            od {new Date(c.fromDate).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {mep.monthlyStats.length > 0 &&
                (() => {
                  const avgAttendance =
                    mep.monthlyStats.reduce((s, m) => s + m.attendanceRate, 0) /
                    mep.monthlyStats.length
                  const totalVotes = mep.monthlyStats.reduce(
                    (s, m) => s + m.totalVotes,
                    0,
                  )
                  return (
                    <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 sm:flex sm:flex-wrap sm:gap-8">
                      <div>
                        <div className="text-xs text-outline">
                          Śr. obecność
                        </div>
                        <div className="font-display text-lg font-bold text-on-surface">
                          {avgAttendance.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-outline">
                          Głosowań łącznie
                        </div>
                        <div className="font-display text-lg font-bold text-on-surface">
                          {totalVotes}
                        </div>
                      </div>
                      {mepSpeeches.length > 0 && (
                        <div>
                          <div className="text-xs text-outline">
                            Przemówienia
                          </div>
                          <div className="font-display text-lg font-bold text-on-surface">
                            {mepSpeeches.length}
                          </div>
                        </div>
                      )}
                      {mepQuestions.length > 0 && (
                        <div>
                          <div className="text-xs text-outline">
                            Pytania parl.
                          </div>
                          <div className="font-display text-lg font-bold text-on-surface">
                            {mepQuestions.length}
                          </div>
                        </div>
                      )}
                      {mepDocs.length > 0 && (
                        <div>
                          <div className="text-xs text-outline">
                            Dokumenty plenarne
                          </div>
                          <div className="font-display text-lg font-bold text-on-surface">
                            {mepDocs.length}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
            </div>
          </div>
        </div>
        {mep.monthlyStats.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display mb-4 text-2xl font-bold text-on-surface">
              Statystyki miesięczne
            </h2>
            <StatsTable stats={mep.monthlyStats} />
          </section>
        )}
        {mep.topVotes.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display mb-4 text-2xl font-bold text-on-surface">
              Najważniejsze głosowania
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mep.topVotes.map((vote) => (
                <VoteCard key={vote.id} vote={vote} />
              ))}
            </div>
          </section>
        )}
        <VoteMonthNav
          months={monthList}
          currentYear={currentYear}
          currentMonth={currentMonth}
          slug={slug}
        />
        {votes.length > 0 ? (
          <section className="mb-8 space-y-6">
            {[...votesByDay.entries()].map(([dateKey, dayVotes]) => {
              const date = new Date(dateKey + 'T12:00:00')
              const dayLabel = `${DAY_NAMES_PL[date.getDay()]} ${date.getDate()} ${MONTHS_PL[date.getMonth()]} ${date.getFullYear()}`
              const forCount = dayVotes.filter(
                (v) => v.voteChoice === 'FOR',
              ).length
              const againstCount = dayVotes.filter(
                (v) => v.voteChoice === 'AGAINST',
              ).length
              const abstainCount = dayVotes.filter(
                (v) => v.voteChoice === 'ABSTAIN',
              ).length
              const absentCount = dayVotes.filter(
                (v) => v.voteChoice === 'ABSENT',
              ).length
              return (
                <div key={dateKey}>
                  <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-xs font-semibold text-outline uppercase tracking-widest">
                      {dayLabel}
                    </h3>
                    <span className="text-xs text-outline">
                      {forCount > 0 && (
                        <span className="text-secondary font-medium">
                          {forCount} za
                        </span>
                      )}
                      {forCount > 0 &&
                        (againstCount > 0 ||
                          abstainCount > 0 ||
                          absentCount > 0) &&
                        ' · '}
                      {againstCount > 0 && (
                        <span className="text-error font-medium">
                          {againstCount} przeciw
                        </span>
                      )}
                      {againstCount > 0 &&
                        (abstainCount > 0 || absentCount > 0) &&
                        ' · '}
                      {abstainCount > 0 && (
                        <span className="text-tertiary font-medium">
                          {abstainCount} wstrz.
                        </span>
                      )}
                      {abstainCount > 0 && absentCount > 0 && ' · '}
                      {absentCount > 0 && (
                        <span className="text-outline font-medium">
                          {absentCount} nieob.
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {dayVotes.map((vote) => (
                      <VoteRow key={vote.id} vote={vote} />
                    ))}
                  </div>
                </div>
              )
            })}
          </section>
        ) : (
          monthList.length > 0 && (
            <p className="mb-8 text-sm text-outline">
              Brak głosowań w {MONTHS_PL[currentMonth - 1].toLowerCase()}{' '}
              {currentYear}.
            </p>
          )
        )}
        {sessionSpeeches.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display mb-4 text-xl font-semibold text-on-surface">
              Przemówienia w tym miesiącu
              <span className="ml-2 text-base font-normal text-outline">
                ({sessionSpeeches.length})
              </span>
            </h2>
            <SpeechesList speeches={sessionSpeeches} />
          </section>
        )}
        {sessionQuestions.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display mb-4 text-xl font-semibold text-on-surface">
              Pytania parlamentarne w tym miesiącu
              <span className="ml-2 text-base font-normal text-outline">
                ({sessionQuestions.length})
              </span>
            </h2>
            <QuestionsList questions={sessionQuestions} />
          </section>
        )}
        {mep.committees.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display mb-4 text-2xl font-bold text-on-surface">Komisje</h2>
            <CommitteeList committees={mep.committees} />
          </section>
        )}
        {mepDocs.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display mb-4 text-xl font-semibold text-on-surface">
              Dokumenty plenarne
              <span className="ml-2 text-base font-normal text-outline">
                ({mepDocs.length})
              </span>
            </h2>
            <DocumentsList documents={mepDocs} />
          </section>
        )}
        {mep.monthlyStats.length === 0 &&
          mep.topVotes.length === 0 &&
          mep.committees.length === 0 &&
          votes.length === 0 && (
            <div className="rounded-md bg-surface-container-low p-12 text-center">
              <p className="text-on-surface-variant">
                Brak danych statystycznych dla tego posła
              </p>
            </div>
          )}
      </Container>
    </div>
  )
}

export const revalidate = 86400 // 24 hours
