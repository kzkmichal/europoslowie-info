import { Container } from '@/components/layout/Container'

export default function loading() {
  return (
    <div className="py-8">
      <Container>
        <div className="space-y-8 animate-pulse">

          {/* VoteHero */}
          <section>
            <div className="mb-6 h-4 w-48 rounded bg-outline-variant/40" />
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="h-5 w-28 rounded-full bg-outline-variant/40" />
              <div className="h-4 w-36 rounded bg-outline-variant/30" />
            </div>
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
              <div className="flex-1 space-y-3">
                <div className="h-10 w-3/4 rounded bg-outline-variant/40" />
                <div className="h-10 w-1/2 rounded bg-outline-variant/30" />
                <div className="h-4 w-64 rounded bg-outline-variant/30" />
              </div>
              <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
                <div className="h-10 w-32 rounded-xl bg-outline-variant/40" />
                <div className="h-4 w-40 rounded bg-outline-variant/30" />
              </div>
            </div>
          </section>

          {/* Context + Sources */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <div className="rounded-2xl p-8 border border-outline-variant/30 space-y-4">
                <div className="h-5 w-48 rounded bg-outline-variant/40" />
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-outline-variant/30" />
                  <div className="h-4 w-full rounded bg-outline-variant/30" />
                  <div className="h-4 w-5/6 rounded bg-outline-variant/30" />
                  <div className="h-4 w-full rounded bg-outline-variant/30" />
                  <div className="h-4 w-4/5 rounded bg-outline-variant/30" />
                  <div className="h-4 w-full rounded bg-outline-variant/30" />
                  <div className="h-4 w-3/4 rounded bg-outline-variant/30" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="rounded-2xl p-8 border border-outline-variant/30 space-y-4">
                <div className="h-5 w-40 rounded bg-outline-variant/40" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 w-full rounded-xl bg-outline-variant/30" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Polish MEPs Section */}
          <div className="rounded-2xl p-8 border border-outline-variant/30 space-y-6">
            <div className="h-6 w-56 rounded bg-outline-variant/40" />
            <div className="h-8 w-full rounded-xl bg-outline-variant/30" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-20 rounded bg-outline-variant/40" />
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-8 w-8 rounded-full bg-outline-variant/30" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Results + Related */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-2xl p-8 border border-outline-variant/30 space-y-4">
              <div className="h-5 w-44 rounded bg-outline-variant/40" />
              <div className="flex gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-1 h-20 rounded-xl bg-outline-variant/30" />
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-8 border border-outline-variant/30 space-y-4">
              <div className="h-5 w-44 rounded bg-outline-variant/40" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 w-full rounded-xl bg-outline-variant/30" />
                ))}
              </div>
            </div>
          </div>

        </div>
      </Container>
    </div>
  )
}
