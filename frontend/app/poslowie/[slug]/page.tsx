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
            <div className="h-32 w-32 shrink-0 rounded-lg bg-gray-200">
              <div className="flex h-full items-center justify-center text-4xl font-bold text-gray-400">
                {mep.fullName.charAt(0)}
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {mep.fullName}
              </h1>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
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
                        <div className="text-xs text-gray-500">
                          Śr. obecność
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {avgAttendance.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">
                          Głosowań łącznie
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {totalVotes}
                        </div>
                      </div>
                      {mepSpeeches.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500">
                            Przemówienia
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            {mepSpeeches.length}
                          </div>
                        </div>
                      )}
                      {mepQuestions.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500">
                            Pytania parl.
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            {mepQuestions.length}
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
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Statystyki miesięczne
            </h2>
            <StatsTable stats={mep.monthlyStats} />
          </section>
        )}
        {mep.topVotes.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
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
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      {dayLabel}
                    </h3>
                    <span className="text-xs text-gray-400">
                      {forCount > 0 && (
                        <span className="text-green-600 font-medium">
                          {forCount} za
                        </span>
                      )}
                      {forCount > 0 &&
                        (againstCount > 0 ||
                          abstainCount > 0 ||
                          absentCount > 0) &&
                        ' · '}
                      {againstCount > 0 && (
                        <span className="text-red-600 font-medium">
                          {againstCount} przeciw
                        </span>
                      )}
                      {againstCount > 0 &&
                        (abstainCount > 0 || absentCount > 0) &&
                        ' · '}
                      {abstainCount > 0 && (
                        <span className="text-yellow-600 font-medium">
                          {abstainCount} wstrz.
                        </span>
                      )}
                      {abstainCount > 0 && absentCount > 0 && ' · '}
                      {absentCount > 0 && (
                        <span className="text-gray-400 font-medium">
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
            <p className="mb-8 text-sm text-gray-500">
              Brak głosowań w {MONTHS_PL[currentMonth - 1].toLowerCase()}{' '}
              {currentYear}.
            </p>
          )
        )}
        {sessionSpeeches.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Przemówienia w tym miesiącu
              <span className="ml-2 text-base font-normal text-gray-500">
                ({sessionSpeeches.length})
              </span>
            </h2>
            <SpeechesList speeches={sessionSpeeches} />
          </section>
        )}
        {sessionQuestions.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Pytania parlamentarne w tym miesiącu
              <span className="ml-2 text-base font-normal text-gray-500">
                ({sessionQuestions.length})
              </span>
            </h2>
            <QuestionsList questions={sessionQuestions} />
          </section>
        )}
        {mep.committees.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Komisje</h2>
            <CommitteeList committees={mep.committees} />
          </section>
        )}
        {mepDocs.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Dokumenty plenarne
              <span className="ml-2 text-base font-normal text-gray-500">
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
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-600">
                Brak danych statystycznych dla tego posła
              </p>
            </div>
          )}
      </Container>
    </div>
  )
}

export const revalidate = 86400 // 24 hours
