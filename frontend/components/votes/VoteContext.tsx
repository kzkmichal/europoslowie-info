import Link from 'next/link'

type VoteDescriptionData = {
  description: string
  bullets: string[]
  source_url: string
  source_type: string
}

function parseVoteDescription(raw: string): VoteDescriptionData | null {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.description === 'string') {
      return parsed as VoteDescriptionData
    }
  } catch {
    // not valid JSON — fall through
  }
  return null
}

type Props = {
  voteDescription?: string | null
  contextAi?: string | null
}

export function VoteContext({ voteDescription, contextAi }: Props) {
  if (voteDescription) {
    const data = parseVoteDescription(voteDescription)

    if (data) {
      return (
        <section className="mb-8 mt-6">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">
              O co chodziło w głosowaniu?
            </h2>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600">
              Opis z Legislative Observatory
            </span>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-5">
            <p className="text-sm leading-relaxed text-gray-800">
              {data.description}
            </p>
            {data.bullets && data.bullets.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {data.bullets.map((bullet, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
            {data.source_url && (
              <p className="mt-4 text-xs text-gray-400">
                Źródło:{' '}
                <Link
                  href={data.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Legislative Observatory (OEIL) ↗
                </Link>
              </p>
            )}
          </div>
        </section>
      )
    }

    return (
      <section className="mb-8 mt-6">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">
            O co chodziło w głosowaniu?
          </h2>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600">
            Opis z Legislative Observatory
          </span>
        </div>
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {voteDescription}
          </p>
        </div>
      </section>
    )
  }
  if (contextAi) {
    return (
      <section className="mb-8 mt-6">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">
            Kontekst głosowania
          </h2>
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
            Opis z EP API
          </span>
        </div>
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {contextAi}
          </p>
        </div>
      </section>
    )
  }

  return null
}
