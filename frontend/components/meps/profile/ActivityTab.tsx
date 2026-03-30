import ActivityMonthNav from '@/components/meps/ActivityMonthNav'
import { SpeechesList } from '@/components/meps/SpeechesList'
import { QuestionsList } from '@/components/meps/QuestionsList'
import type { MEPActivityMonthSummary } from '@/lib/types'
import type { Speech, Question } from '@/lib/db/schema'

type ActivityTabProps = {
  monthList: MEPActivityMonthSummary[]
  speeches: Speech[]
  questions: Question[]
  currentYear: number
  currentMonth: number
  slug: string
}

export const ActivityTab = ({
  monthList,
  speeches,
  questions,
  currentYear,
  currentMonth,
  slug,
}: ActivityTabProps) => {
  return (
    <div>
      <ActivityMonthNav
        months={monthList}
        currentYear={currentYear}
        currentMonth={currentMonth}
        slug={slug}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-surface-container-low rounded-xl p-6">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-widest mb-6 border-b border-outline-variant/15 pb-4">
            Przemówienia
            <span className="ml-2 text-xs font-semibold text-outline normal-case tracking-normal">
              ({speeches.length})
            </span>
          </h3>
          <SpeechesList speeches={speeches} />
        </section>
        <section className="bg-surface-container-low rounded-xl p-6">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-widest mb-6 border-b border-outline-variant/15 pb-4">
            Pytania parlamentarne
            <span className="ml-2 text-xs font-semibold text-outline normal-case tracking-normal">
              ({questions.length})
            </span>
          </h3>
          <QuestionsList questions={questions} />
        </section>
      </div>
    </div>
  )
}
