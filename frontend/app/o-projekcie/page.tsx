import { Container } from '@/components/layout/Container'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'O projekcie | Europosłowie.info',
  description:
    'Europosłowie.info to platforma monitorująca aktywność 53 polskich europosłów w Parlamencie Europejskim. Transparentność, obiektywność i dane publiczne.',
  keywords: [
    'o projekcie',
    'Europosłowie.info',
    'monitoring PE',
    'transparentność polityczna',
    'parlament europejski',
  ],
}

export default function OProjekciePage() {
  return (
    <div className="py-8">
      <Container size="narrow">
        <article className="prose prose-gray max-w-none">
          <h1 className="text-3xl font-bold text-gray-900">O projekcie</h1>
          <p className="text-lg text-gray-600">
            Platforma transparentności dla polskich europosłów
          </p>
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900">Nasza misja</h2>
            <div className="mt-4 space-y-3 text-gray-700">
              <p>
                <strong>Europosłowie.info</strong> to niezależna platforma
                stworzona w celu zwiększenia transparentności działań polskich
                europosłów w Parlamencie Europejskim.
              </p>
              <p>
                Wierzymy, że obywatele mają prawo do łatwego dostępu do
                informacji o tym, jak ich przedstawiciele głosują i działają w
                instytucjach europejskich. Naszym celem jest dostarczanie
                rzetelnych, obiektywnych danych o aktywności wszystkich 53
                polskich europosłów.
              </p>
            </div>
          </section>
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900">Co robimy?</h2>
            <div className="mt-4 space-y-4 text-gray-700">
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">
                  📊 Monitorujemy aktywność
                </h3>
                <p className="mt-2 text-sm">
                  Zbieramy i analizujemy dane o obecności, głosowaniach i
                  uczestnictwie w pracach komisji parlamentarnych.
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">
                  🗳️ Analizujemy głosowania
                </h3>
                <p className="mt-2 text-sm">
                  Oceniamy ważność poszczególnych głosowań dla Polski i
                  pokazujemy, jak głosowali polscy europosłowie.
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">
                  📈 Tworzymy rankingi
                </h3>
                <p className="mt-2 text-sm">
                  Generujemy miesięczne rankingi aktywności na podstawie
                  obiektywnych, mierzalnych wskaźników.
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">
                  💡 Edukujemy obywateli
                </h3>
                <p className="mt-2 text-sm">
                  Przedstawiamy dane w przystępnej formie, aby każdy mógł
                  zrozumieć działania swoich przedstawicieli.
                </p>
              </div>
            </div>
          </section>
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900">Nasze wartości</h2>
            <div className="mt-4 space-y-3 text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900">
                  🔍 Transparentność
                </h3>
                <p className="text-sm">
                  Wszystkie dane pochodzą z oficjalnych, publicznych źródeł
                  Parlamentu Europejskiego. Nasza metodologia jest w pełni jawna
                  i opisana.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">⚖️ Obiektywność</h3>
                <p className="text-sm">
                  Nie faworyzujemy żadnych posłów ani partii politycznych.
                  Ranking oparty jest wyłącznie na weryfikowalnych danych.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">🆓 Dostępność</h3>
                <p className="text-sm">
                  Platforma jest całkowicie darmowa i dostępna dla wszystkich
                  obywateli bez żadnych ograniczeń.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">🔄 Regularność</h3>
                <p className="text-sm">
                  Dane są aktualizowane regularnie, aby zapewnić dostęp do
                  najnowszych informacji o aktywności europosłów.
                </p>
              </div>
            </div>
          </section>
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900">Technologia</h2>
            <div className="mt-4 space-y-3 text-gray-700">
              <p>
                Platforma została zbudowana przy użyciu nowoczesnych technologii
                webowych:
              </p>
              <ul className="list-disc space-y-1 pl-6 text-sm">
                <li>
                  Next.js 16 - framework React do renderowania po stronie
                  serwera
                </li>
                <li>TypeScript - zapewnia bezpieczeństwo typów</li>
                <li>PostgreSQL - baza danych do przechowywania informacji</li>
                <li>Tailwind CSS - responsywny design</li>
              </ul>
              <p className="text-sm">
                Kod źródłowy projektu jest dostępny na GitHubie, co zapewnia
                pełną transparentność działania platformy.
              </p>
            </div>
          </section>
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Aktualizacja danych
            </h2>
            <div className="mt-4 space-y-3 text-gray-700">
              <p>
                Dane są pobierane z oficjalnych źródeł Parlamentu Europejskiego
                i aktualizowane regularnie:
              </p>
              <ul className="list-disc space-y-1 pl-6 text-sm">
                <li>Statystyki obecności - aktualizacja miesięczna</li>
                <li>
                  Wyniki głosowań - aktualizacja po każdej sesji plenarnej
                </li>
                <li>Skład komisji - aktualizacja kwartalna</li>
              </ul>
            </div>
          </section>
          <section className="mt-8 rounded-lg bg-green-50 p-6">
            <h3 className="text-lg font-semibold text-green-900">
              📂 Projekt Open Source
            </h3>
            <p className="mt-2 text-sm text-green-800">
              Europosłowie.info to projekt open source. Kod źródłowy jest
              dostępny publicznie, co pozwala każdemu zweryfikować poprawność
              działania platformy i zaproponować ulepszenia.
            </p>
          </section>
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900">Kontakt</h2>
            <div className="mt-4 space-y-3 text-gray-700">
              <p>
                Masz pytania, sugestie lub chciałbyś zgłosić błąd? Skontaktuj
                się z nami:
              </p>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm">
                  <strong>Email:</strong>{' '}
                  <a
                    href="mailto:kontakt@europoslowie.info"
                    className="text-blue-600 underline"
                  >
                    kontakt@europoslowie.info
                  </a>
                </p>
                <p className="mt-2 text-sm">
                  <strong>GitHub:</strong>{' '}
                  <a
                    href="https://github.com/yourusername/europoslowie-info"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    github.com/yourusername/europoslowie-info
                  </a>
                </p>
              </div>
            </div>
          </section>
          <section className="mt-8 rounded-lg border-2 border-gray-200 bg-gray-50 p-6">
            <h3 className="text-sm font-semibold text-gray-900">
              ⚠️ Zastrzeżenie
            </h3>
            <p className="mt-2 text-xs text-gray-600">
              Europosłowie.info to projekt niezależny, nieafiliowany z żadną
              partią polityczną ani instytucją rządową. Dane prezentowane na
              stronie pochodzą z oficjalnych źródeł publicznych i są
              przedstawiane w dobrej wierze. Nie ponosimy odpowiedzialności za
              ewentualne błędy w danych źródłowych.
            </p>
          </section>
        </article>
      </Container>
    </div>
  )
}
