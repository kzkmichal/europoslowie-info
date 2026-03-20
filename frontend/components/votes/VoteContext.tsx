export function VoteContext({ contextAi }: { contextAi: string }) {
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Kontekst głosowania</h2>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
          Opis z EP API
        </span>
      </div>
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="whitespace-pre-wrap text-sm text-gray-700">{contextAi}</p>
      </div>
    </section>
  )
}
