import { useRef, useState } from 'react'
import { area as d3area, line as d3line, max, min, scaleBand, scaleLinear } from 'd3'
import type { Line } from '../lib/trade'
import { useLang } from '../i18n/context'
import { getLocale } from '../lib/format'
import { useWidth } from '../lib/useWidth'
import Tooltip from './Tooltip'
import './TimeChart.css'

const M = { top: 10, right: 10, bottom: 30, left: 56 }

interface Props {
  lines: Line[]
  type: 'line' | 'bar'
  format: (value: number) => string     // tooltip values
  formatAxis: (value: number) => string // y-axis labels
  area?: boolean                        // shade under a single line
  dashed?: string[]                     // names of lines drawn dashed (e.g. imports)
}

// Month labels for the tooltip: "2026-08" -> "ago. 2026"
const monthLabel = (date: string) => {
  if (date.length === 4) return date
  const [y, m] = date.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(getLocale(), { month: 'short', year: 'numeric' }).replace(/ de /g, ' ')
}

export default function TimeChart({ lines, type, format, formatAxis, area = false, dashed = [] }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const { t } = useLang()
  const [boxRef, W] = useWidth<HTMLDivElement>(960)   // real width in pixels
  const H = W < 600 ? 240 : 300
  const [hover, setHover] = useState<{ index: number; x: number; y: number; flip: boolean } | null>(null)

  const dates = [...new Set(lines.flatMap((l) => l.points.map((p) => p.date)))].sort()
  const values = lines.flatMap((l) => l.points.map((p) => p.value))
  if (dates.length === 0) return <div className="muted" ref={boxRef}>{t.common.noData}</div>

  // Scales: one band per date on x; values on y (always including zero)
  const x = scaleBand().domain(dates).range([M.left, W - M.right]).paddingInner(type === 'bar' ? 0.2 : 0)
  const y = scaleLinear()
    .domain([Math.min(0, min(values) ?? 0), max(values) ?? 1])
    .nice()
    .range([H - M.bottom, M.top])
  const inner = scaleBand().domain(lines.map((l) => l.name)).range([0, x.bandwidth()]).paddingInner(0.05)
  const center = (date: string) => (x(date) ?? 0) + x.bandwidth() / 2
  const path = d3line<{ date: string; value: number }>().x((p) => center(p.date)).y((p) => y(p.value))
  const shade = d3area<{ date: string; value: number }>().x((p) => center(p.date)).y0(y(0)).y1((p) => y(p.value))

  // x-axis labels: only years (January of each year, or every point when annual)
  const annual = dates[0].length === 4
  const yearTicks = dates.filter((d) => annual || d.endsWith('-01'))
  const step = Math.ceil(yearTicks.length / Math.max(Math.floor(W / 70), 2)) // about one label per 70 px

  const onMove = (e: React.MouseEvent) => {
    const box = svgRef.current!.getBoundingClientRect()
    const svgX = e.clientX - box.left
    const index = Math.floor((svgX - M.left) / x.step())
    const px = e.clientX - box.left
    if (index >= 0 && index < dates.length) setHover({ index, x: px, y: e.clientY - box.top, flip: px > box.width * 0.65 })
    else setHover(null)
  }

  const hoverDate = hover ? dates[hover.index] : null

  return (
    <div className="time-chart" ref={boxRef}>
      {lines.length > 1 && (
        <ul className="chart-legend">
          {lines.map((l) => (
            <li key={l.name} className={dashed.includes(l.name) ? 'dashed' : undefined} style={{ '--c': l.color } as React.CSSProperties}>
              {l.name}
            </li>
          ))}
        </ul>
      )}

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="time-chart-svg" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {y.ticks(5).map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} className={t === 0 ? 'grid zero' : 'grid'} />
            <text x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="axis">{formatAxis(t)}</text>
          </g>
        ))}
        {yearTicks.filter((_, i) => i % step === 0).map((d) => (
          <text key={d} x={center(d)} y={H - 8} textAnchor="middle" className="axis">{d.slice(0, 4)}</text>
        ))}

        {type === 'line'
          ? lines.map((l) => (
              <g key={l.name}>
                {area && lines.length === 1 && <path d={shade(l.points) ?? ''} fill={l.color} opacity={0.14} />}
                <path d={path(l.points) ?? ''} fill="none" stroke={l.color} strokeWidth={1.6}
                  strokeDasharray={dashed.includes(l.name) ? '4 3' : undefined} />
              </g>
            ))
          : lines.map((l) =>
              l.points.map((p) => (
                <rect key={`${l.name}-${p.date}`} x={(x(p.date) ?? 0) + (inner(l.name) ?? 0)} width={inner.bandwidth()}
                  y={Math.min(y(p.value), y(0))} height={Math.abs(y(p.value) - y(0))} fill={l.color} />
              )),
            )}

        {hoverDate && (
          <>
            <line x1={center(hoverDate)} x2={center(hoverDate)} y1={M.top} y2={H - M.bottom} className="cursor" />
            {type === 'line' && lines.map((l) => {
              const p = l.points.find((pt) => pt.date === hoverDate)
              return p ? <circle key={l.name} cx={center(hoverDate)} cy={y(p.value)} r={3.5} fill={l.color} /> : null
            })}
          </>
        )}
      </svg>

      {hover && hoverDate && (
        <Tooltip x={hover.x} y={hover.y} flip={hover.flip}>
          <strong>{monthLabel(hoverDate)}</strong>
          {lines.map((l) => {
            const p = l.points.find((pt) => pt.date === hoverDate)
            return (
              <span key={l.name} className="tip-row">
                <span><span className="tip-swatch" style={{ background: l.color }} />{l.name}</span>
                <span className="num">{p ? format(p.value) : '—'}</span>
              </span>
            )
          })}
        </Tooltip>
      )}
    </div>
  )
}
