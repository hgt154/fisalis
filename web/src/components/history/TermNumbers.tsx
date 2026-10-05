import { useLang } from '../../i18n/context'
import { formatValue } from '../../lib/format'
import { termStat } from '../../lib/history'
import type { Series } from '../../lib/types'
import { useWidth } from '../../lib/useWidth'
import { yearRanges } from '../../lib/conflicts'

interface Props {
  series: Series | null
  years: number[]          // years attributed to the government (see termYears)
}

const GROWTH = 'NY.GDP.MKTP.KD.ZG'
const INFLATION = 'FP.CPI.TOTL.ZG'
const UNEMPLOYMENT = 'SL.UEM.TOTL.ZS'
const GDP_PC = 'NY.GDP.PCAP.CD'
const CONTEXT = 8           // years shown on each side of the term in the chart

const pct = (v: number) => formatValue(v, 'percent')

// "The numbers of the term": averages of the main indicators over the years in office,
// and a bar chart of GDP growth with the term highlighted against the years around it
export default function TermNumbers({ series, years }: Props) {
  const { t } = useLang()
  const r = t.ruler

  if (years.length === 0) return <p className="muted">{r.noYears}</p>

  const growth = termStat(series?.[GROWTH], years)
  const inflation = termStat(series?.[INFLATION], years)
  const unemployment = termStat(series?.[UNEMPLOYMENT], years)
  const gdpPc = termStat(series?.[GDP_PC], years)

  if (!growth && !inflation && !unemployment && !gdpPc) return <p className="muted">{r.noData}</p>

  const tiles = [
    growth && { label: r.growth, value: pct(growth.mean), note: r.perYear },
    inflation && {
      label: r.inflation,
      value: pct(inflation.mean),
      note: inflation.years > 1 ? `${r.perYear} · ${r.peak(pct(inflation.peak[1]), inflation.peak[0])}` : r.perYear,
    },
    unemployment && { label: r.unemployment, value: pct(unemployment.mean), note: r.perYear },
    gdpPc && {
      label: r.gdpPc,
      value: formatValue(gdpPc.last[1], 'currency'),
      note: gdpPc.years > 1 ? r.fromTo(`${formatValue(gdpPc.first[1], 'currency')} (${gdpPc.first[0]})`, String(gdpPc.last[0])) : String(gdpPc.last[0]),
    },
  ].filter((x): x is { label: string; value: string; note: string } => Boolean(x))

  return (
    <div className="term-numbers">
      <dl className="term-tiles">
        {tiles.map((tile) => (
          <div key={tile.label}>
            <dt>{tile.label}</dt>
            <dd className="num">{tile.value}</dd>
            <dd className="muted">{tile.note}</dd>
          </div>
        ))}
      </dl>
      {growth && <GrowthBars points={series?.[GROWTH] ?? []} years={years} label={r.growthChart} />}
      <p className="term-note muted">{r.numbersNote(yearRanges(years))}</p>
    </div>
  )
}

// Bars of GDP growth for the term and the years around it; the term's bars in the accent color
function GrowthBars({ points, years, label }: { points: [number, number][]; years: number[]; label: string }) {
  const [boxRef, W] = useWidth<HTMLElement>(640)
  const H = 150
  const PAD = { top: 10, bottom: 22, left: 34, right: 6 }

  const from = years[0] - CONTEXT
  const to = years[years.length - 1] + CONTEXT
  const shown = points.filter(([y]) => y >= from && y <= to)
  if (shown.length === 0) return null

  const first = shown[0][0]
  const last = shown[shown.length - 1][0]
  const n = last - first + 1
  const values = shown.map(([, v]) => v)
  const max = Math.max(0, ...values)
  const min = Math.min(0, ...values)
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const step = plotW / n
  const y = (v: number) => PAD.top + ((max - v) / (max - min || 1)) * plotH
  const ticks = [min, 0, max].filter((v, i, all) => all.indexOf(v) === i)
  // The term's first and last years always get a label; the chart's ends only if they don't collide
  const termEnds = [years[0], years[years.length - 1]]
  const labelYears = [...new Set([first, ...termEnds, last])]
    .filter((yr) => termEnds.includes(yr) || termEnds.every((e) => Math.abs(e - yr) >= 4))

  return (
    <figure className="term-chart" ref={boxRef}>
      <figcaption className="kicker">{label}</figcaption>
      <svg width={W} height={H} role="img" aria-label={label}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className={v === 0 ? 'axis-zero' : 'grid'} />
            <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" className="tick">{Math.round(v)}%</text>
          </g>
        ))}
        {shown.map(([year, v]) => {
          const inTerm = years.includes(year)
          const x = PAD.left + (year - first) * step + step * 0.15
          return (
            <rect
              key={year}
              x={x}
              width={Math.max(1, step * 0.7)}
              y={Math.min(y(v), y(0))}
              height={Math.max(1, Math.abs(y(v) - y(0)))}
              className={inTerm ? 'bar in-term' : 'bar'}
            >
              <title>{`${year}: ${pct(v)}`}</title>
            </rect>
          )
        })}
        {labelYears.map((yr) => (
          <text key={yr} x={PAD.left + (yr - first) * step + step / 2} y={H - 6} textAnchor="middle" className="tick">{yr}</text>
        ))}
      </svg>
    </figure>
  )
}
