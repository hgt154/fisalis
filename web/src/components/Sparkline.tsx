import { useState } from 'react'
import { extent, line, scaleLinear } from 'd3'
import { useLang } from '../i18n/context'
import { useWidth } from '../lib/useWidth'
import Tooltip from './Tooltip'

export const MIN_POINTS = 3   // fewer points than this: no line, a short note instead

interface SparkSeries {
  name: string                 // shown in the tooltip ("Brasil")
  color: string
  points: [number, number][]   // [year, value]
}

interface Props {
  series: SparkSeries[]
  fromYear: number
  toYear: number
  format: (value: number) => string   // how values read in the tooltip
  height?: number
}

const PAD = 5   // room for the dots at the edges

export default function Sparkline({ series, fromYear, toYear, format, height = 40 }: Props) {
  const { t } = useLang()
  const [boxRef, width] = useWidth<HTMLDivElement>(240)          // drawn at its real width, so dots stay round
  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number; flip: boolean } | null>(null)

  const drawable = series.filter((s) => s.points.length >= MIN_POINTS)

  if (drawable.length === 0) {
    const n = Math.max(0, ...series.map((s) => s.points.length))
    if (n === 0) return <span className="muted">—</span>
    return <span className="spark-note">{t.panel.fewPoints(n)}</span>
  }

  // Same scales for every line, so compared countries share one vertical axis
  const [min, max] = extent(drawable.flatMap((s) => s.points), (p) => p[1]) as [number, number]
  const x = scaleLinear().domain([fromYear, toYear]).range([PAD, width - PAD])
  const y = scaleLinear().domain(min === max ? [min - 1, max + 1] : [min, max]).range([height - PAD, PAD])
  const draw = line<[number, number]>().x((p) => x(p[0])).y((p) => y(p[1]))

  // Years that have data in at least one series: the pointer snaps to the nearest of these
  const years = [...new Set(drawable.flatMap((s) => s.points.map((p) => p[0])))].sort((a, b) => a - b)
  const single = drawable.length === 1

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - box.left
    const year = x.invert(px)
    const nearest = years.reduce((best, yr) => (Math.abs(yr - year) < Math.abs(best - year) ? yr : best), years[0])
    setHoverYear(nearest)
    setPointer({ x: x(nearest), y: 0, flip: px > box.width * 0.5 })
  }
  const onLeave = () => { setHoverYear(null); setPointer(null) }

  const valueAt = (s: SparkSeries, year: number) => s.points.find((p) => p[0] === year)?.[1]

  return (
    <div ref={boxRef} className="spark-box">
      <svg className="spark" width={width} height={height} onPointerMove={onMove} onPointerLeave={onLeave} aria-hidden="true">
        {/* Invisible rectangle: the whole sparkline is the hover target, not just the thin line */}
        <rect width={width} height={height} fill="transparent" />

        {hoverYear !== null && <line className="spark-cursor" x1={x(hoverYear)} x2={x(hoverYear)} y1={0} y2={height} />}

        {drawable.map((s) => (
          <g key={s.name}>
            <path d={draw(s.points) ?? ''} fill="none" stroke={s.color} strokeWidth={1.5} />
            {/* One small dot per observation (single series only; several lines would get crowded) */}
            {single && s.points.map(([yr, v]) => (
              <circle key={yr} cx={x(yr)} cy={y(v)} r={1.8} fill={s.color} />
            ))}
          </g>
        ))}

        {/* The hovered year: bigger dots with a ring in the background color */}
        {hoverYear !== null && drawable.map((s) => {
          const v = valueAt(s, hoverYear)
          return v === undefined ? null : (
            <circle key={s.name} className="spark-dot" cx={x(hoverYear)} cy={y(v)} r={4} fill={s.color} />
          )
        })}
      </svg>

      {hoverYear !== null && pointer && (
        <Tooltip x={pointer.x} y={0} flip={pointer.flip} above>
          <strong>{hoverYear}</strong>
          {drawable.map((s) => {
            const v = valueAt(s, hoverYear)
            return (
              <span key={s.name} className="tip-row">
                <span><span className="tip-swatch" style={{ background: s.color }} />{s.name}</span>
                <span className="num">{v === undefined ? '—' : format(v)}</span>
              </span>
            )
          })}
        </Tooltip>
      )}
    </div>
  )
}
