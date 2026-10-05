import { Link } from 'react-router'
import { useLang } from '../../i18n/context'
import { REGIMES, regimeColor, yearsLabel, type Era, type Ruler } from '../../lib/history'

interface Props {
  rulers: Ruler[]
  eras: Era[]
  current?: string         // slug of the government to highlight (on a government's page)
}

const time = (date: string) => Date.parse(date)
const NOW = Date.now()   // the band runs up to the moment the page was loaded

// A horizontal band from the first government to today: one segment per government, as wide as
// its time in office and colored by the kind of government; the eras are labeled above.
export default function HistoryTimeline({ rulers, eras, current }: Props) {
  const { t, lang } = useLang()
  const h = t.history
  if (rulers.length === 0) return null

  const from = time(rulers[0].start)
  const to = NOW
  const span = to - from
  const pct = (ms: number) => `${Math.max(0, Math.min(100, ((ms - from) / span) * 100))}%`
  const width = (a: number, b: number) => `${Math.max(0.15, ((b - a) / span) * 100)}%`
  const firstYear = new Date(from).getFullYear()
  const decades = Array.from({ length: 20 }, (_, i) => Math.ceil(firstYear / 10) * 10 + i * 10)
    .filter((y) => Date.UTC(y, 0, 1) < to)
  const used = REGIMES.filter((r) => rulers.some((x) => x.regime === r))

  return (
    <figure className="hist-timeline">
      <div className="hist-eras" aria-hidden="true">
        {eras.map((e) => {
          const a = Math.max(from, Date.UTC(e.from, 0, 1))
          const b = e.to === null ? to : Date.UTC(e.to, 0, 1)
          if (b <= from) return null
          return (
            <span key={e.from} className="hist-era" style={{ left: pct(a), width: width(a, b) }} title={e.name[lang]}>
              {e.name[lang]}
            </span>
          )
        })}
      </div>

      <div className="hist-band">
        {rulers.map((r) => {
          const a = time(r.start)
          const b = r.end ? time(r.end) : to
          return (
            <Link
              key={r.slug}
              to={`/historia/${r.iso3}/${r.slug}`}
              className={`hist-seg${r.slug === current ? ' current' : ''}`}
              style={{ left: pct(a), width: width(a, b), background: regimeColor(r.regime) }}
              title={`${r.name} (${yearsLabel(r)})`}
              aria-label={`${r.name}, ${yearsLabel(r)}`}
            />
          )
        })}
      </div>

      <div className="hist-ticks" aria-hidden="true">
        {decades.map((y) => <span key={y} style={{ left: pct(Date.UTC(y, 0, 1)) }}>{y}</span>)}
      </div>

      <figcaption className="hist-legend">
        {used.map((r) => (
          <span key={r}><i style={{ background: regimeColor(r) }} />{h.regimes[r]}</span>
        ))}
      </figcaption>
    </figure>
  )
}
