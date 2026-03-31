import type { MepDocument } from '@/lib/db/schema'
import { DOC_TYPE_LABELS, DOC_ROLE_LABELS } from '@/lib/constants'

function formatDate(d: Date | null | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface DocumentsListProps {
  documents: MepDocument[]
}

export function DocumentsList({ documents }: DocumentsListProps) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-gray-500">Brak dokumentów plenarnych</p>
    )
  }

  return (
    <ul className="space-y-3">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start gap-2">
            <div className="flex flex-wrap gap-1.5">
              {doc.documentType && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                </span>
              )}
              {doc.role && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  {DOC_ROLE_LABELS[doc.role] ?? doc.role}
                </span>
              )}
              {doc.committee && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {doc.committee}
                </span>
              )}
            </div>
            {doc.documentDate && (
              <span className="ml-auto shrink-0 text-xs text-gray-400">
                {formatDate(doc.documentDate)}
              </span>
            )}
          </div>
          <a
            href={doc.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-sm font-medium text-blue-700 hover:underline"
          >
            {doc.title}
          </a>
        </li>
      ))}
    </ul>
  )
}
