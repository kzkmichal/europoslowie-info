  import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  timestamp,
  date,
  text,
  jsonb,
  real,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const meps = pgTable('meps', {
  id: serial('id').primaryKey(),
  epId: integer('ep_id').notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  nationalParty: varchar('national_party', { length: 100 }),
  epGroup: varchar('ep_group', { length: 100 }),
  photoUrl: varchar('photo_url', { length: 500 }),
  email: varchar('email', { length: 255 }),
  websiteUrl: varchar('website_url', { length: 500 }),
  termStart: timestamp('term_start').notNull(),
  termEnd: timestamp('term_end'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const monthlyStats = pgTable('monthly_stats', {
  id: serial('id').primaryKey(),
  mepId: integer('mep_id')
    .notNull()
    .references(() => meps.id),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  totalVotes: integer('total_votes').notNull().default(0),
  votesFor: integer('votes_for').notNull().default(0),
  votesAgainst: integer('votes_against').notNull().default(0),
  votesAbstain: integer('votes_abstain').notNull().default(0),
  votesAbsent: integer('votes_absent').notNull().default(0),
  attendanceRate: real('attendance_rate').notNull().default(0),
  rankingAmongPoles: integer('ranking_among_poles'),
  rankingInGroup: integer('ranking_in_group'),
  questionsCount: integer('questions_count').default(0),
  speechesCount: integer('speeches_count').default(0),
  reportsCount: integer('reports_count').default(0),
  votes5Star: integer('votes_poland_5star').default(0),
  votes4Star: integer('votes_poland_4star').default(0),
})

export const votingSessions = pgTable('voting_sessions', {
  id: serial('id').primaryKey(),
  sessionNumber: varchar('session_number', { length: 50 }).notNull().unique(),
  startDate: date('start_date', { mode: 'date' }).notNull(),
  endDate: date('end_date', { mode: 'date' }).notNull(),
  location: varchar('location', { length: 100 }),
  sessionType: varchar('session_type', { length: 50 }),
  status: varchar('status', { length: 50 }).notNull().default('completed'),
  totalVotes: integer('total_votes').default(0),
})

export const votes = pgTable('votes', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .notNull()
    .references(() => votingSessions.id),
  mepId: integer('mep_id')
    .notNull()
    .references(() => meps.id),
  voteNumber: varchar('vote_number', { length: 50 }),
  title: text('title').notNull(),
  titleEn: text('title_en'),
  date: date('date', { mode: 'date' }).notNull(),
  voteChoice: varchar('vote_choice', { length: 20 }).notNull(), // FOR, AGAINST, ABSTAIN, ABSENT
  result: varchar('result', { length: 20 }), // ADOPTED, REJECTED
  votesFor: integer('votes_for'),
  votesAgainst: integer('votes_against'),
  votesAbstain: integer('votes_abstain'),
  documentReference: varchar('document_reference', { length: 100 }),
  documentUrl: text('document_url'),
  contextAi: text('context_ai'),
  starsPoland: integer('stars_poland'),
  starsReasoning: jsonb('stars_reasoning').$type<string[]>(),
  argumentsFor: jsonb('arguments_for').$type<
    Array<{
      quote: string
      speaker: string
      group: string
      country: string
    }>
  >(),
  argumentsAgainst: jsonb('arguments_against').$type<
    Array<{
      quote: string
      speaker: string
      group: string
      country: string
    }>
  >(),
  polishVotesFor: integer('polish_votes_for'),
  polishVotesAgainst: integer('polish_votes_against'),
  polishVotesAbstain: integer('polish_votes_abstain'),
  polishVotesAbsent: integer('polish_votes_absent'),
  topicCategory: varchar('topic_category', { length: 100 }),
  policyArea: varchar('policy_area', { length: 100 }),
  isMain: boolean('is_main').notNull().default(false),
  decLabel: text('dec_label'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  mepId: integer('mep_id')
    .notNull()
    .references(() => meps.id),
  questionNumber: varchar('question_number', { length: 50 }).notNull().unique(),
  questionText: text('question_text').notNull(),
  addressedTo: varchar('addressed_to', { length: 255 }).notNull(),
  dateSubmitted: date('date_submitted', { mode: 'date' }).notNull(),
  dateAnswered: date('date_answered', { mode: 'date' }),
  answerText: text('answer_text'),
  answeredBy: varchar('answered_by', { length: 255 }),
  qualityScore: integer('quality_score'),
  topics: jsonb('topics').$type<string[]>(),
})

export const speeches = pgTable('speeches', {
  id: serial('id').primaryKey(),
  mepId: integer('mep_id')
    .notNull()
    .references(() => meps.id),
  debateTopic: text('debate_topic').notNull(),
  speechDate: date('speech_date', { mode: 'date' }).notNull(),
  durationSeconds: integer('duration_seconds'),
  transcript: text('transcript'),
  videoUrl: text('video_url'),
  mainPoints: jsonb('main_points').$type<string[]>(),
  tone: varchar('tone', { length: 50 }),
  topics: jsonb('topics').$type<string[]>(),
})

// Source type values for vote_sources table
export const SOURCE_TYPES = [
  'RCV_XML',        // Results of roll-call votes (XML) — EP doceo, generated from meeting_id
  'VOT_XML',        // Results of votes (XML) — EP doceo, generated from meeting_id
  'REPORT',         // Report or resolution (HTML) — EP doceo, derived from dec_label doc_ref
  'PROCEDURE_OEIL', // Procedure file (Legislative Observatory) — requires extra EP API call
  'PRESS_RELEASE',  // Press release — requires async RSS scraping pipeline
] as const
export type SourceType = (typeof SOURCE_TYPES)[number]

export const voteSources = pgTable('vote_sources', {
  id: serial('id').primaryKey(),
  voteNumber: varchar('vote_number', { length: 50 }).notNull(),
  url: text('url').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  sourceType: varchar('source_type', { length: 50 }).notNull().$type<SourceType>(),
  accessedAt: timestamp('accessed_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const committeeMemberships = pgTable('committee_memberships', {
  id: serial('id').primaryKey(),
  mepId: integer('mep_id')
    .notNull()
    .references(() => meps.id),
  committeeCode: varchar('committee_code', { length: 20 }).notNull(),
  committeeName: varchar('committee_name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(), // member, substitute, chair, vice-chair
  fromDate: date('from_date', { mode: 'date' }).notNull(),
  toDate: date('to_date', { mode: 'date' }),
  isCurrent: boolean('is_current').notNull().default(true),
})

export const mepsRelations = relations(meps, ({ many }) => ({
  monthlyStats: many(monthlyStats),
  votes: many(votes),
  questions: many(questions),
  speeches: many(speeches),
  committeeMemberships: many(committeeMemberships),
}))

export const monthlyStatsRelations = relations(monthlyStats, ({ one }) => ({
  mep: one(meps, {
    fields: [monthlyStats.mepId],
    references: [meps.id],
  }),
}))

export const votesRelations = relations(votes, ({ one }) => ({
  mep: one(meps, {
    fields: [votes.mepId],
    references: [meps.id],
  }),
  session: one(votingSessions, {
    fields: [votes.sessionId],
    references: [votingSessions.id],
  }),
}))
export const questionsRelations = relations(questions, ({ one }) => ({
  mep: one(meps, {
    fields: [questions.mepId],
    references: [meps.id],
  }),
}))

export const speechesRelations = relations(speeches, ({ one }) => ({
  mep: one(meps, {
    fields: [speeches.mepId],
    references: [meps.id],
  }),
}))

export const committeeMembershipsRelations = relations(
  committeeMemberships,
  ({ one }) => ({
    mep: one(meps, {
      fields: [committeeMemberships.mepId],
      references: [meps.id],
    }),
  })
)

export type MEP = typeof meps.$inferSelect
export type MonthlyStats = typeof monthlyStats.$inferSelect
export type Vote = typeof votes.$inferSelect
export type VotingSession = typeof votingSessions.$inferSelect
export type CommitteeMembership = typeof committeeMemberships.$inferSelect
export type Question = typeof questions.$inferSelect
export type Speech = typeof speeches.$inferSelect

export type InsertMEP = typeof meps.$inferInsert
export type InsertMonthlyStats = typeof monthlyStats.$inferInsert
export type InsertVote = typeof votes.$inferInsert
export type InsertVotingSession = typeof votingSessions.$inferInsert
export type InsertCommitteeMembership = typeof committeeMemberships.$inferInsert
export type InsertQuestion = typeof questions.$inferInsert
export type InsertSpeech = typeof speeches.$inferInsert
