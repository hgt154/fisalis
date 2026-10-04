import { useState } from 'react'
import { max, scaleBand, scaleLinear } from 'd3'
import { useWidth } from '../lib/useWidth'
import Tooltip from './Tooltip'
import './TimeChart.css'

export interface StackedRow {
  label: string                    // x-axis label ("1946", "2026-01")
  values: Record<string, number>
}

interface Props {
  rows: StackedRow[]
  keys: string[]                   // bottom to top
  colorOf: (key: string) => string
  labelOf: (key: string) => string
  format: (value: number) => string
  formatAxis?: (value: number) => string
  tickLabel?: (label: string) => string
  totalLabel?: string              // adds a "Total" line to the tooltip
  height?: number
}

const M = { top: 8, right: 8, bottom: 28, left: 48 }

// Stacked columns: one per row (year or month), split by key
export default function StackedBars({ rows, keys, colorOf, labelOf, format, formatAxis = format, tickLabel = (l) => l, totalLabel, height }: Props) {
  const [boxRef, W] = useWidth<HTMLDivElement>(800)
  const H = height ?? (W < 600 ? 220 : 280)
  const [hover, setHover] = useState<{ index: number; x: number; y: number; flip: boolean } | null>(null)

  const totals = rows.map((r) => keys.reduce((sum, k) => sum + (r.values[k] ?? 0), 0))
  const x = scaleBand().domain(rows.map((r) => r.label)).range([M.left, W - M.right]).paddingInner(rows.length > 40 ? 0.15 : 0.25)
  const y = scaleLinear().domain([0, max(totals) || 1]).nice().range([H - M.bottom, M.top])
  const step = Math.max(1, Math.ceil(rows.length / Math.max(Math.floor(W / 56), 2)))

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - box.left
    const index = Math.floor(((px / box.width) * W - M.left) / x.step())
    if (index >= 0 && index < rows.length) setHover({ index, x: px, y: e.clientY - box.top, flip: px > box.width * 0.6 })
    else setHover(null)
  }
  const current = hover ? rows[hover.index] : null

  return (
    <div className="time-chart" ref={boxRef}>
      <svg viewBox={`0 0 ${W} ${H}`} className="time-chart-svg" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {y.ticks(4).map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} className={t === 0 ? 'grid zero' : 'grid'} />
            <text x={M.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="axis">{formatAxis(t)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          let base = 0
          return (
            <g key={r.label} opacity={hover && hover.index !== i ? 0.55 : 1}>
              {keys.map((k) => {
                const v = r.values[k] ?? 0
                const y0 = y(base)
                base += v
                return v > 0 ? <rect key={k} x={x(r.label)} width={x.bandwidth()} y={y(base)} height={y0 - y(base)} fill={colorOf(k)} /> : null
              })}
            </g>
          )
        })}
        {rows.map((r, i) => (i % step === 0 ? (
          <text key={r.label} x={(x(r.label) ?? 0) + x.bandwidth() / 2} y={H - 8} textAnchor="middle" className="axis">{tickLabel(r.label)}</text>
        ) : null))}
      </svg>

      {hover && current && (
        <Tooltip x={hover.x} y={hover.y} flip={hover.flip}>
          <strong>{tickLabel(current.label)}</strong>
          {[...keys].reverse().map((k) => (
            <span key={k} className="tip-row">
              <span><span className="tip-swatch" style={{ background: colorOf(k) }} />{labelOf(k)}</span>
              <span className="num">{format(current.values[k] ?? 0)}</span>
            </span>
          ))}
          {totalLabel && (
            <span className="tip-row"><strong>{totalLabel}</strong><strong className="num">{format(totals[hover.index])}</strong></span>
          )}
        </Tooltip>
      )}
    </div>
  )
}
