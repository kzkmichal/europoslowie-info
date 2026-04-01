import { Container } from '@/components/layout/Container'

const VoteCardSkeleton = () => (
  <div className="animate-pulse rounded-lg border border-border p-4">
    <div className="mb-3 flex gap-2">
      <div className="h-5 w-20 rounded-full bg-surface-container-high"></div>
      <div className="h-5 w-16 rounded-full bg-surface-container-high"></div>
    </div>
    <div className="mb-2 h-4 w-full rounded bg-surface-container-high"></div>
    <div className="mb-2 h-4 w-5/6 rounded bg-surface-container-high"></div>
    <div className="h-4 w-3/4 rounded bg-surface-container-high"></div>
    <div className="mt-3 h-3 w-24 rounded bg-surface-container"></div>
  </div>
)

export default function Loading() {
  return (
    <div className="py-8">
      <Container>
        <div className="mb-6 animate-pulse">
          <div className="mb-2 h-8 w-48 rounded bg-surface-container-high"></div>
          <div className="h-4 w-32 rounded bg-surface-container"></div>
        </div>
        <div className="mb-6 h-12 w-full rounded-lg bg-surface-container"></div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <VoteCardSkeleton key={i} />
          ))}
        </div>
      </Container>
    </div>
  )
}
