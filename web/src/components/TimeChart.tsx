// line or grouped-bar chart over time, with axes and a hover tooltip.


import { useRef, useState } from 'react'
import { line as d3line, max, min, scaleBand, scaleLinear } from 'd3'
import type { Line } from '../lib/trade'
import Tooltip from './Tooltip'

const W = 900
const H = 300
const M = { top: 10, right: 10, bottom: 30, left: 60 }

interface Props {
  lines: Line[]
  type: 'line' | 'bar'
  format: (value: number) => string     // tooltip values
  formatAxis: (value: number) => string // y-axis labels
}

export default function TimeChart({ lines, type, format, formatAxis }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null)

  const dates = [...new Set(lines.flatMap((l) => l.points.map((p) => p.date)))].sort()
  const values = lines.flatMap((l) => l.points.map((p) => p.value))
  if (dates.length === 0) return <p>Sem dados.</p>

  // Scales: one band per date on x; values on y (always including zero)
  const x = scaleBand().domain(dates).range([M.left, W - M.right]).paddingInner(type === 'bar' ? 0.2 : 0)
  const y = scaleLinear()
    .domain([Math.min(0, min(values) ?? 0), max(values) ?? 1])
    .nice()
    .range([H - M.bottom, M.top])
  const inner = scaleBand().domain(lines.map((l) => l.name)).range([0, x.bandwidth()]).paddingInner(0.05)
  const center = (date: string) => (x(date) ?? 0) + x.bandwidth() / 2
  const path = d3line<{ date: string; value: number }>().x((p) => center(p.date)).y((p) => y(p.value))

  // x-axis labels: only years (January of each year, or every point when annual)
  const annual = dates[0].length === 4
  const yearTicks = dates.filter((d) => annual || d.endsWith('-01'))
  const step = Math.ceil(yearTicks.length / 12) // avoid crowding

  const onMove = (e: React.MouseEvent) => {
    const box = svgRef.current!.getBoundingClientRect()
    const svgX = ((e.clientX - box.left) / box.width) * W
    const index = Math.floor((svgX - M.left) / x.step())
    if (index >= 0 && index < dates.length) setHover({ index, x: e.clientX - box.left, y: e.clientY - box.top })
    else setHover(null)
  }

  const hoverDate = hover ? dates[hover.index] : null

  return (
    <div style={{ position: 'relative' }}>
      <ul style={{ display: 'flex', gap: 'var(--space-md)', listStyle: 'none', padding: 0, flexWrap: 'wrap' }}>
        {lines.map((l) => (
          <li key={l.name}>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: l.color, marginRight: 4 }} />
            {l.name}
          </li>
        ))}
      </ul>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {y.ticks(5).map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeDasharray={t === 0 ? undefined : '3 3'} />
            <text x={M.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--color-text-muted)">
              {formatAxis(t)}
            </text>
          </g>
        ))}
        {yearTicks.filter((_, i) => i % step === 0).map((d) => (
          <text key={d} x={center(d)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--color-text-muted)">
            {d.slice(0, 4)}
          </text>
        ))}

        {type === 'line'
          ? lines.map((l) => <path key={l.name} d={path(l.points) ?? ''} fill="none" stroke={l.color} strokeWidth={1.5} />)
          : lines.map((l) =>
              l.points.map((p) => (
                <rect key={`${l.name}-${p.date}`} x={(x(p.date) ?? 0) + (inner(l.name) ?? 0)} width={inner.bandwidth()}
                  y={Math.min(y(p.value), y(0))} height={Math.abs(y(p.value) - y(0))} fill={l.color} />
              )),
            )}

        {hoverDate && (
          <line x1={center(hoverDate)} x2={center(hoverDate)} y1={M.top} y2={H - M.bottom} stroke="var(--color-text-muted)" />
        )}
      </svg>

      {hover && hoverDate && (
        <Tooltip x={hover.x} y={hover.y}>
          <strong>{hoverDate}</strong>
          {lines.map((l) => {
            const p = l.points.find((pt) => pt.date === hoverDate)
            return <div key={l.name} style={{ color: l.color }}>{l.name}: {p ? format(p.value) : '—'}</div>
          })}
        </Tooltip>
      )}
    </div>
  )
}