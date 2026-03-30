'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import type { MepDocument } from '@/lib/db/schema'
import { DOC_TYPE_LABELS, DOC_ROLE_LABELS } from '@/lib/constants'

const formatDate = (d: Date | null | undefined): string => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

type DocumentsTabProps = {
  documents: MepDocument[]
}

export const DocumentsTab = ({ documents }: DocumentsTabProps) => {
  const [typeFilter, setTypeFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')

  const availableYears = [
    ...new Set(
      documents
        .filter((d) => d.documentDate)
        .map((d) => new Date(d.documentDate!).getFullYear()),
    ),
  ].sort((a, b) => b - a)

  const filtered = documents.filter((doc) => {
    if (typeFilter !== 'all' && doc.documentType !== typeFilter) return false
    if (yearFilter !== 'all') {
      const docYear = doc.documentDate
        ? new Date(doc.documentDate).getFullYear().toString()
        : null
      if (docYear !== yearFilter) return false
    }
    return true
  })

  return (
    <div className="bg-surface-container-low rounded-xl p-6">
      <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-6 border-b border-outline-variant/15 pb-4">
        Dokumenty
        <span className="ml-2 text-xs font-semibold text-outline normal-case tracking-normal">
          ({documents.length})
        </span>
      </h3>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">Wszystkie typy</option>
          {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {availableYears.length > 1 && (
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Wszystkie lata</option>
            {availableYears.map((year) => (
              <option key={year} value={year.toString()}>{year}</option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-outline">Brak dokumentów spełniających kryteria.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((doc) => (
            <li
              key={doc.id}
              className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-4"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex flex-wrap gap-1.5">
                  {doc.documentType && (
                    <span className="inline-flex items-center rounded-full bg-secondary-container text-on-secondary-container px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest">
                      {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                    </span>
                  )}
                  {doc.role && (
                    <span className="inline-flex items-center rounded-full bg-secondary-container text-on-secondary-container px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest">
                      {DOC_ROLE_LABELS[doc.role] ?? doc.role}
                    </span>
                  )}
                  {doc.committee && (
                    <span className="inline-flex items-center rounded-full bg-secondary-container text-on-secondary-container px-2.5 py-0.5 font-mono text-[10px] font-bold">
                      {doc.committee}
                    </span>
                  )}
                </div>
                {doc.documentDate && (
                  <span className="shrink-0 text-xs text-outline">
                    {formatDate(doc.documentDate)}
                  </span>
                )}
              </div>

              <div className="flex items-end justify-between gap-4">
                <p className="text-sm font-semibold text-on-surface">{doc.title}</p>
                <a
                  href={doc.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-outline hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
