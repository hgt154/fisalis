import { extent, line, scaleLinear } from 'd3'

export const MIN_POINTS = 3   // fewer points than this: no line, the value alone is shown

interface Props {
  series: { color: string; points: [number, number][] }[]
  fromYear: number
  toYear: number
  width?: number
  height?: number
}

export default function Sparkline({ series, fromYear, toYear, width = 160, height = 36 }: Props) {
  const drawable = series.filter((s) => s.points.length >= MIN_POINTS)
  if (drawable.length === 0) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>

  // Same scales for every line, so compared countries share one vertical axis
  const [min, max] = extent(drawable.flatMap((s) => s.points), (p) => p[1]) as [number, number]
  const x = scaleLinear().domain([fromYear, toYear]).range([2, width - 2])
  const y = scaleLinear().domain(min === max ? [min - 1, max + 1] : [min, max]).range([height - 2, 2])
  const draw = line<[number, number]>().x((p) => x(p[0])).y((p) => y(p[1]))

  return (
    <svg width={width} height={height} aria-hidden="true">
      {drawable.map((s, i) => (
        <path key={i} d={draw(s.points) ?? ''} fill="none" stroke={s.color} strokeWidth={1.5} />
      ))}
    </svg>
  )
}