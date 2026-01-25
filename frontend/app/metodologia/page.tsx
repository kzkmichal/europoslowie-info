import { Container } from '@/components/Container'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Metodologia | Europosłowie.info',
  description:
    'Poznaj metodologię rankingu polskich europosłów. Dowiedz się jak obliczamy statystyki obecności, oceniamy głosowania i wyznaczamy ranking aktywności.',
  keywords: [
    'metodologia',
    'ranking europosłów',
    'system oceny',
    'statystyki PE',
    'ocena posłów',
  ],
}

export default function MetodologiaPage() {
  return (
    <div className="py-8">
      <Container size="narrow">
        <article className="prose prose-gray max-w-none">
          <h1 className="text-3xl font-bold text-gray-900">Metodologia</h1>
          <p className="text-lg text-gray-600">
            Jak oceniamy aktywność polskich europosłów w Parlamencie Europejskim
          </p>
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900">
              System rankingowy
            </h2>
            <p className="mt-4 text-gray-700">
              Ranking polskich europosłów obliczany jest na podstawie kilku
              kluczowych wskaźników aktywności parlamentarnej. Każdy miesiąc
              generujemy nowy ranking uwzględniający najnowsze dane.
            </p>
          </section>
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Wskaźnik obecności
            </h2>
            <div className="mt-4 space-y-3 text-gray-700">
              <p>
                <strong>Wskaźnik obecności (Attendance Rate)</strong> to
                procentowy stosunek obecności posła podczas sesji plenarnych i
                głosowań.
              </p>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-mono">
                  Obecność = (Liczba obecności / Całkowita liczba głosowań) ×
                  100%
                </p>
              </div>
              <p className="text-sm">
                Wysoka obecność (powyżej 90%) oznacza bardzo aktywny udział w
                pracach parlamentu. Obecność poniżej 70% może sygnalizować niską
                aktywność.
              </p>
            </div>
          </section>
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Aktywność głosowania
            </h2>
            <div className="mt-4 space-y-3 text-gray-700">
              <p>
                Monitorujemy każde głosowanie europosła, kategoryzując je jako:
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong className="text-green-700">Za (FOR)</strong> - głos na
                  "tak"
                </li>
                <li>
                  <strong className="text-red-700">Przeciw (AGAINST)</strong> -
                  głos na "nie"
                </li>
                <li>
                  <strong className="text-yellow-700">
                    Wstrzymanie się (ABSTAIN)
                  </strong>{' '}
                  - wstrzymanie się od głosu
                </li>
                <li>
                  <strong className="text-gray-700">
                    Nieobecność (ABSENT)
                  </strong>{' '}
                  - brak udziału w głosowaniu
                </li>
              </ul>
            </div>
          </section>
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Ocena ważności głosowań
            </h2>
            <div className="mt-4 space-y-3 text-gray-700">
              <p>
                Każde głosowanie jest oceniane pod kątem jego znaczenia dla
                Polski w skali od 1 do 5 gwiazdek (⭐):
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="text-lg">⭐⭐⭐⭐⭐</span>
                  <span>
                    <strong>5 gwiazdek</strong> - kluczowe znaczenie dla
                    polskiej gospodarki lub społeczeństwa
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">⭐⭐⭐⭐</span>
                  <span>
                    <strong>4 gwiazdki</strong> - bardzo ważne dla Polski
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">⭐⭐⭐</span>
                  <span>
                    <strong>3 gwiazdki</strong> - umiarkowane znaczenie
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">⭐⭐</span>
                  <span>
                    <strong>2 gwiazdki</strong> - niewielkie znaczenie
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">⭐</span>
                  <span>
                    <strong>1 gwiazdka</strong> - minimalne znaczenie
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm">
                Ocena uwzględnia potencjalny wpływ na: gospodarkę, finanse
                publiczne, prawo krajowe, społeczeństwo oraz relacje
                międzynarodowe Polski.
              </p>
            </div>
          </section>
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900">Źródła danych</h2>
            <div className="mt-4 space-y-3 text-gray-700">
              <p>
                Wszystkie dane pochodzą z oficjalnych źródeł Parlamentu
                Europejskiego:
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  Oficjalna strona Parlamentu Europejskiego (europarl.europa.eu)
                </li>
                <li>Publiczne rejestry głosowań</li>
                <li>Dane o składzie komisji parlamentarnych</li>
                <li>Statystyki obecności i aktywności posłów</li>
              </ul>
              <p className="mt-4">
                Dane są aktualizowane regularnie, aby zapewnić aktualność
                informacji.
              </p>
            </div>
          </section>
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900">Przejrzystość</h2>
            <div className="mt-4 space-y-3 text-gray-700">
              <p>
                Naszym celem jest zapewnienie obiektywnej i przejrzystej oceny
                aktywności europosłów. Wszystkie wskaźniki są obliczane
                automatycznie na podstawie weryfikowalnych danych publicznych.
              </p>
              <p>
                Nie stosujemy subiektywnych ocen ani nie faworyzujemy żadnych
                posłów czy partii politycznych. Ranking odzwierciedla wyłącznie
                mierzalną aktywność parlamentarną.
              </p>
            </div>
          </section>
          <section className="mt-8 rounded-lg bg-blue-50 p-6">
            <h3 className="text-lg font-semibold text-blue-900">
              Pytania o metodologię?
            </h3>
            <p className="mt-2 text-sm text-blue-800">
              Jeśli masz pytania dotyczące naszej metodologii lub chciałbyś
              zgłosić uwagi, skontaktuj się z nami przez stronę{' '}
              <a href="/o-projekcie" className="font-medium underline">
                O projekcie
              </a>
              .
            </p>
          </section>
        </article>
      </Container>
    </div>
  )
}
