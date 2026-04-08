'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'

const ErrorPage = ({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) => {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="py-16">
      <Container size="narrow">
        <div className="text-center">
          <p className="text-6xl font-bold text-error opacity-20">500</p>
          <h1 className="mt-4 text-2xl font-bold text-primary">
            Coś poszło nie tak
          </h1>
          <p className="mt-3 text-on-surface-variant">
            Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={reset}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-on-primary hover:opacity-90 transition-opacity"
            >
              Spróbuj ponownie
            </button>
            <Link
              href="/"
              className="rounded-full border border-outline px-6 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
            >
              Strona główna
            </Link>
          </div>
        </div>
      </Container>
    </div>
  )
}

export default ErrorPage
