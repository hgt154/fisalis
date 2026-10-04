import { useState } from 'react'
import { area, scaleLinear, stack, type SeriesPoint } from 'd3'
import { getLocale } from '../lib/format'
import { useWidth } from '../lib/useWidth'
import Tooltip from './Tooltip'
import './TimeChart.css'

export interface ShareYear {
  year: number
  shares: Record<string, number>   // key -> 0..1, adding up to 1
}

interface Props {
  years: ShareYear[]
  keys: string[]                        // bottom to top
  colorOf: (key: string) => string
  labelOf: (key: string) => string
}

const M = { top: 8, right: 10, bottom: 28, left: 40 }
const pct = (v: number, digits = 1) =>
  `${(v * 100).toLocaleString(getLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`

// 100% stacked areas: how a total is split between groups, year after year
export default function StackedShareChart({ years, keys, colorOf, labelOf }: Props) {
  const [boxRef, W] = useWidth<HTMLDivElement>(800)
  const H = W < 600 ? 240 : 300
  const [hover, setHover] = useState<{ index: number; x: number; y: number; flip: boolean } | null>(null)
  if (years.length < 2) return <div ref={boxRef} />

  const first = years[0].year
  const last = years.at(-1)!.year
  const x = scaleLinear().domain([first, last]).range([M.left, W - M.right])
  const y = scaleLinear().domain([0, 1]).range([H - M.bottom, M.top])
  const layers = stack<ShareYear>().keys(keys).value((d, key) => d.shares[key] ?? 0)(years)
  const shape = area<SeriesPoint<ShareYear>>()
    .x((d) => x(d.data.year))
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]))

  const step = Math.max(1, Math.ceil((last - first) / Math.max(Math.floor(W / 70), 2)))
  const ticks = years.map((d) => d.year).filter((yr) => (yr - first) % step === 0)

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - box.left
    const year = Math.round(x.invert((px / box.width) * W))
    const index = years.findIndex((d) => d.year === year)
    if (index >= 0) setHover({ index, x: px, y: e.clientY - box.top, flip: px > box.width * 0.6 })
    else setHover(null)
  }
  const current = hover ? years[hover.index] : null

  return (
    <div className="time-chart" ref={boxRef}>
      <svg viewBox={`0 0 ${W} ${H}`} className="time-chart-svg" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {layers.map((layer) => (
          <path key={layer.key} d={shape(layer) ?? ''} fill={colorOf(layer.key)} stroke="var(--color-bg)" strokeWidth={0.5} />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text key={t} x={M.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="axis">{pct(t, 0)}</text>
        ))}
        {ticks.map((yr) => (
          <text key={yr} x={x(yr)} y={H - 8} textAnchor="middle" className="axis">{yr}</text>
        ))}
        {current && <line x1={x(current.year)} x2={x(current.year)} y1={M.top} y2={H - M.bottom} className="cursor" />}
      </svg>

      {hover && current && (
        <Tooltip x={hover.x} y={hover.y} flip={hover.flip}>
          <strong>{current.year}</strong>
          {[...keys].reverse().filter((k) => (current.shares[k] ?? 0) >= 0.001).map((k) => (
            <span key={k} className="tip-row">
              <span><span className="tip-swatch" style={{ background: colorOf(k) }} />{labelOf(k)}</span>
              <span className="num">{pct(current.shares[k])}</span>
            </span>
          ))}
        </Tooltip>
      )}
    </div>
  )
}
