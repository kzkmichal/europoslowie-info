import { Container } from '@/components/layout/Container'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Metodologia',
  description:
    'Poznaj metodologię rankingu polskich europosłów. Dowiedz się jak obliczamy statystyki obecności, oceniamy głosowania i wyznaczamy ranking aktywności.',
  keywords: [
    'metodologia',
    'ranking europosłów',
    'system oceny',
    'statystyki PE',
    'ocena posłów',
  ],
  openGraph: { url: 'https://europoslowie.pl/metodologia' },
}

export default function MetodologiaPage() {
  return (
    <div className="py-8">
      <Container size="narrow">
        <article className="max-w-none">
          <h1 className="text-3xl font-bold text-primary">Metodologia</h1>
          <p className="mt-2 text-lg text-on-surface-variant">
            Jak zbieramy dane, oceniamy aktywność i używamy AI w Europosłowie.info
          </p>

          <section className="mt-8">
            <h2 className="text-2xl font-bold text-primary">Źródła danych</h2>
            <div className="mt-4 space-y-3 text-on-surface">
              <p>
                Wszystkie dane pochodzą z oficjalnych źródeł Parlamentu Europejskiego
                i są pobierane automatycznie co miesiąc:
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong>EP Open Data API v2</strong> — listy sesji plenarnych,
                  wyniki głosowań, dane europosłów, komisje parlamentarne
                </li>
                <li>
                  <strong>EP doceo</strong> — pliki XML z wynikami głosowań imiennych
                  (RCV) oraz sprawozdania
                </li>
                <li>
                  <strong>Legislative Observatory (OEIL)</strong> — streszczenia
                  procedur legislacyjnych
                </li>
              </ul>
              <p>
                Dane są aktualizowane raz w miesiącu po zakończeniu sesji plenarnej.
              </p>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold text-primary">
              Wskaźnik obecności
            </h2>
            <div className="mt-4 space-y-3 text-on-surface">
              <p>
                <strong>Wskaźnik obecności</strong> to procentowy stosunek głosowań,
                w których poseł wziął udział (oddał głos ZA, PRZECIW lub WSTRZYMAŁ SIĘ),
                do wszystkich głosowań w danym miesiącu.
              </p>
              <div className="rounded-lg bg-surface-container-low p-4 border border-outline-variant/30">
                <p className="text-sm font-mono text-on-surface-variant">
                  Obecność = (ZA + PRZECIW + WSTRZYMAŁ SIĘ) / Wszystkie głosowania × 100%
                </p>
              </div>
              <p className="text-sm text-on-surface-variant">
                Nieobecność jest rejestrowana automatycznie — jeśli poseł nie oddał głosu,
                jest oznaczony jako NIEOBECNY.
              </p>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold text-primary">
              Aktywność głosowania
            </h2>
            <div className="mt-4 space-y-3 text-on-surface">
              <p>
                Każde głosowanie europosła jest rejestrowane jako jeden z czterech stanów:
              </p>
              <ul className="list-none space-y-2 pl-0">
                <li className="flex items-center gap-3">
                  <span className="inline-block w-3 h-3 rounded-full bg-primary-container shrink-0" />
                  <span><strong>Za</strong> — głos na "tak"</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="inline-block w-3 h-3 rounded-full bg-on-error-container shrink-0" />
                  <span><strong>Przeciw</strong> — głos na "nie"</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="inline-block w-3 h-3 rounded-full bg-on-tertiary-fixed-variant shrink-0" />
                  <span><strong>Wstrzymanie się</strong> — brak opowiedzenia się po żadnej stronie</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="inline-block w-3 h-3 rounded-full bg-outline shrink-0" />
                  <span><strong>Nieobecność</strong> — brak udziału w głosowaniu</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold text-primary">
              Istotność głosowania dla Polski
            </h2>
            <div className="mt-4 space-y-3 text-on-surface">
              <p>
                Każde głosowanie jest automatycznie oceniane pod kątem znaczenia dla Polski.
                Ocena przebiega w dwóch etapach:
              </p>
              <h3 className="text-lg font-semibold text-on-surface mt-4">1. Pre-filter (bez AI)</h3>
              <p>
                Przed wywołaniem AI sprawdzamy tytuł głosowania pod kątem słów kluczowych:
              </p>
              <ul className="list-disc space-y-1 pl-6 text-sm text-on-surface-variant">
                <li>Głosowania proceduralne (porządek obrad itp.) → automatycznie neutralne</li>
                <li>Bezpośrednio dotyczące Polski (KPO, ukraińskie zboże, Mercosur) → automatycznie kluczowe</li>
              </ul>
              <h3 className="text-lg font-semibold text-on-surface mt-4">2. Ocena AI (Claude Haiku)</h3>
              <p>
                Pozostałe głosowania trafiają do modelu AI, który ocenia konkretne skutki
                prawne, finansowe i gospodarcze dla Polski — biorąc pod uwagę jej profil:
                zależność od węgla, pozycję największego beneficjenta funduszy UE, granicę
                wschodnią i strukturę przemysłu.
              </p>
              <p>
                Wynik oceny to jedna z trzech kategorii:
              </p>
              <div className="space-y-3 mt-2">
                <div className="flex items-start gap-3 rounded-lg bg-error-container/50 border border-error-container px-4 py-3">
                  <span className="text-base shrink-0">🔴</span>
                  <div>
                    <strong className="text-on-error-container">Kluczowe (score 70–100)</strong>
                    <p className="text-sm text-on-error-container/80 mt-0.5">
                      Bezpośredni wpływ na Polskę — zobowiązania prawne, przepływ funduszy UE,
                      bezpieczeństwo wschodniej flanki, dominujące sektory polskiej gospodarki.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border px-4 py-3" style={{ backgroundColor: 'color-mix(in srgb, var(--tertiary-fixed) 50%, transparent)', borderColor: 'color-mix(in srgb, var(--on-tertiary-fixed-variant) 30%, transparent)' }}>
                  <span className="text-base shrink-0">🟡</span>
                  <div>
                    <strong className="text-on-tertiary-fixed-variant">Istotne (score 40–69)</strong>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--on-tertiary-fixed-variant)', opacity: 0.8 }}>
                      Pośredni wpływ ponadprzeciętny dla Polski ze względu na strukturę
                      gospodarczą lub geopolityczną pozycję. Polska jest jednym z głównie
                      dotkniętych krajów.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg bg-surface-container border border-outline-variant/40 px-4 py-3">
                  <span className="text-base shrink-0">⚪</span>
                  <div>
                    <strong className="text-on-surface-variant">Neutralne (score 0–39)</strong>
                    <p className="text-sm text-on-surface-variant/80 mt-0.5">
                      Brak realnego wpływu — sektory marginalne dla Polski, zarządzanie
                      wewnętrzne UE, rezolucje dotyczące krajów bez związku z Polską.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant mt-2">
                Głosowania neutralne nie są oznaczane na liście głosowań — widoczne są
                tylko kategorie kluczowe i istotne.
              </p>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold text-primary">
              Jak używamy AI
            </h2>
            <div className="mt-4 space-y-3 text-on-surface">
              <p>
                AI jest używane w dwóch miejscach — wyłącznie do analizy dokumentów
                i generowania opisów. Nie ocenia posłów i nie wpływa na dane o głosowaniach.
              </p>
              <div className="space-y-4 mt-4">
                <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
                  <h3 className="font-semibold text-on-surface flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-secondary-container/60 text-on-secondary-container border border-secondary-container">✦ AI</span>
                    Kontekst głosowania
                  </h3>
                  <p className="text-sm mt-2 text-on-surface-variant">
                    Model <strong className="text-on-surface">Claude Haiku 4.5</strong> tłumaczy streszczenie procedury
                    legislacyjnej z angielskiego na przystępny polski opis dla przeciętnego
                    obywatela. Podstawą jest dokument z Legislative Observatory (OEIL).
                    Opis jest oznaczony w interfejsie jako "✦ AI".
                  </p>
                </div>
                <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
                  <h3 className="font-semibold text-on-surface">
                    🔴🟡 Ocena istotności dla Polski
                  </h3>
                  <p className="text-sm mt-2 text-on-surface-variant">
                    Model <strong className="text-on-surface">Claude Haiku 4.5</strong> ocenia każde głosowanie pod kątem
                    konkretnych skutków dla Polski. Prompt zawiera profil Polski (energetyka,
                    fundusze UE, rolnictwo, bezpieczeństwo). Wynik to score 0–100 i uzasadnienie
                    w 2–3 zdaniach widoczne na stronie głosowania.
                  </p>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant mt-2">
                Oceny AI mogą zawierać błędy — szczególnie przy głosowaniach, dla których
                brakuje streszczenia dokumentu (dostępny jest tylko tytuł).
              </p>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold text-primary">Przejrzystość</h2>
            <div className="mt-4 space-y-3 text-on-surface">
              <p>
                Wszystkie dane o głosowaniach i obecności europosłów pochodzą z oficjalnych,
                publicznie dostępnych rejestrów PE i są pobierane bez modyfikacji.
                Ranking odzwierciedla wyłącznie mierzalną aktywność parlamentarną.
              </p>
              <p className="text-on-surface-variant">
                Nie stosujemy subiektywnych ocen posłów ani nie faworyzujemy żadnych
                partii politycznych.
              </p>
            </div>
          </section>

          <section className="mt-8 rounded-lg bg-secondary-container/30 border border-secondary-container p-6">
            <h3 className="text-lg font-semibold text-on-secondary-container">
              Pytania o metodologię?
            </h3>
            <p className="mt-2 text-sm text-on-secondary-container/80">
              Jeśli masz pytania lub chciałbyś zgłosić uwagi, skontaktuj się z nami przez stronę{' '}
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
