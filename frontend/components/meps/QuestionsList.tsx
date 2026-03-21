import type { Question } from '@/lib/db/schema'
import type { BaseProps } from '@/lib/types'
import { cn } from '@/lib/utils'

type QuestionsListProps = BaseProps & {
  questions: Question[]
}

export function QuestionsList({
  questions,
  className,
  'data-testid': dataTestId,
  'data-cc': dataCc,
  id,
}: QuestionsListProps) {
  if (questions.length === 0) {
    return <div className="text-sm text-gray-500">Brak pytań parlamentarnych</div>
  }

  return (
    <div
      className={cn('space-y-3', className)}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      {questions.map((question) => (
        <div
          key={question.id}
          className="rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {question.subject}
              </p>
              {question.questionNumber && (
                <p className="mt-1 text-xs text-gray-400">
                  Nr {question.questionNumber}
                </p>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
              {question.addressedTo}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
            <span>
              <span className="font-medium">Złożone: </span>
              {new Date(question.dateSubmitted).toLocaleDateString('pl-PL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            {question.dateAnswered && (
              <span>
                <span className="font-medium">Odpowiedź: </span>
                {new Date(question.dateAnswered).toLocaleDateString('pl-PL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                {question.answeredBy && ` (${question.answeredBy})`}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
