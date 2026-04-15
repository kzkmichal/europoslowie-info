import Link from 'next/link'

const TRACKED = [
  {
    label: 'Głosowania',
    desc: 'Każde głosowanie plenarne z wynikiem i stanowiskiem posła',
  },
  {
    label: 'Przemówienia',
    desc: 'Wystąpienia na sali plenarnej z transkryptem',
  },
  {
    label: 'Pytania parlamentarne',
    desc: 'Pytania do Komisji i Rady Europejskiej',
  },
  { label: 'Komisje', desc: 'Członkostwo w komisjach parlamentarnych' },
]

export const TrackedCard = () => (
  <div className="bg-primary text-primary-foreground p-6 rounded-lg flex flex-col justify-between">
    <div>
      <span className="text-[10px] font-bold tracking-widest text-primary-foreground/60 uppercase mb-3 block">
        Co analizujemy
      </span>
      <ul className="flex flex-col gap-3">
        {TRACKED.map(({ label, desc }) => (
          <li key={label}>
            <div className="text-sm font-bold">{label}</div>
            <div className="text-[11px] text-primary-foreground/70 leading-snug">
              {desc}
            </div>
          </li>
        ))}
      </ul>
    </div>
    <Link
      href="/metodologia"
      className="text-primary-foreground font-bold text-sm underline decoration-primary-foreground/50 hover:decoration-primary-foreground transition-all mt-4"
    >
      Metodologia →
    </Link>
  </div>
)
