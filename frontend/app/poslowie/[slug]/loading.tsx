import { Container } from '@/components/layout/Container'

export default function loading() {
  return (
    <div className="py-8">
      <Container>
        <div className="animate-pulse">
          {/* ProfileHeader */}
          <section className="bg-surface-container-low rounded-xl p-6 mb-6">
            <div className="flex gap-6 items-start">
              <div className="shrink-0 w-24 lg:w-32 aspect-3/4 rounded-lg bg-outline-variant/30" />
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <div className="h-7 w-56 rounded bg-outline-variant/40" />
                    <div className="h-5 w-10 rounded bg-outline-variant/30" />
                  </div>
                  <div className="h-4 w-40 rounded bg-outline-variant/30" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-5 w-10 rounded bg-outline-variant/30"
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-6 pt-1 border-t border-outline-variant/20">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-3 w-16 rounded bg-outline-variant/30" />
                      <div className="h-5 w-12 rounded bg-outline-variant/40" />
                    </div>
                  ))}
                  <div className="ml-auto h-8 w-24 rounded-lg bg-outline-variant/30" />
                </div>
              </div>
            </div>
          </section>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-9 w-24 rounded-lg bg-outline-variant/30"
              />
            ))}
          </div>

          {/* Tab content — stats table */}
          <div className="space-y-4">
            <div className="rounded-xl border border-outline-variant/30 overflow-hidden">
              <div className="p-4 border-b border-outline-variant/20">
                <div className="h-5 w-40 rounded bg-outline-variant/40" />
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-4 py-3 border-b border-outline-variant/10 last:border-0"
                >
                  <div className="h-4 w-24 rounded bg-outline-variant/30" />
                  <div className="flex-1 h-4 rounded bg-outline-variant/20" />
                  <div className="h-4 w-16 rounded bg-outline-variant/30" />
                  <div className="h-4 w-16 rounded bg-outline-variant/30" />
                  <div className="h-4 w-16 rounded bg-outline-variant/30" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
