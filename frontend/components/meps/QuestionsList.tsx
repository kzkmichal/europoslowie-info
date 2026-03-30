import type { Question } from '@/lib/db/schema'
import type { BaseProps } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'

type QuestionsListProps = BaseProps & {
  questions: Question[]
}

export const QuestionsList = ({
  questions,
  className,
  'data-testid': dataTestId,
  'data-cc': dataCc,
  id,
}: QuestionsListProps) => {
  if (questions.length === 0) {
    return (
      <div className="text-sm text-outline">Brak pytań parlamentarnych</div>
    )
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
          className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-4"
        >
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="rounded-full bg-secondary-container text-on-secondary-container px-3 py-1 text-[10px] font-bold uppercase tracking-widest ">
              {question.addressedTo}
            </span>
            {question.questionNumber && (
              <span className="text-xs text-outline">
                Nr {question.questionNumber}
              </span>
            )}
          </div>

          <p className="text-sm font-semibold text-on-surface">
            {question.subject}
          </p>

          <div className="mt-3 flex items-end justify-between gap-4">
            <div className="flex flex-wrap gap-3 text-xs text-outline">
              <span>
                Złożone:{' '}
                <span className="font-medium text-on-surface-variant">
                  {new Date(question.dateSubmitted).toLocaleDateString(
                    'pl-PL',
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    },
                  )}
                </span>
              </span>
              {question.dateAnswered && (
                <span>
                  Odpowiedź:{' '}
                  <span className="font-medium text-on-surface-variant">
                    {new Date(question.dateAnswered).toLocaleDateString(
                      'pl-PL',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      },
                    )}
                    {question.answeredBy && ` (${question.answeredBy})`}
                  </span>
                </span>
              )}
            </div>
            {question.questionNumber && (
              <a
                href={`https://www.europarl.europa.eu/doceo/document/${question.questionNumber}_PL.html`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-outline hover:text-primary transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
