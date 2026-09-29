import { extent, line, scaleLinear } from 'd3'

export const MIN_POINTS = 3   // fewer points than this: no line, a short note instead

interface Props {
  series: { color: string; points: [number, number][] }[]
  fromYear: number
  toYear: number
  height?: number
}

const W = 240   // drawing width; the SVG stretches to fill its column

export default function Sparkline({ series, fromYear, toYear, height = 36 }: Props) {
  const drawable = series.filter((s) => s.points.length >= MIN_POINTS)

  if (drawable.length === 0) {
    const n = Math.max(0, ...series.map((s) => s.points.length))
    if (n === 0) return <span className="muted">—</span>
    return <span className="spark-note">Poucos pontos para uma série ({n} {n === 1 ? 'observação' : 'observações'})</span>
  }

  // Same scales for every line, so compared countries share one vertical axis
  const [min, max] = extent(drawable.flatMap((s) => s.points), (p) => p[1]) as [number, number]
  const x = scaleLinear().domain([fromYear, toYear]).range([1, W - 1])
  const y = scaleLinear().domain(min === max ? [min - 1, max + 1] : [min, max]).range([height - 3, 3])
  const draw = line<[number, number]>().x((p) => x(p[0])).y((p) => y(p[1]))

  return (
    // preserveAspectRatio="none" stretches the drawing to any width;
    // vector-effect keeps the stroke 1.5 px thick while it stretches
    <svg className="spark" viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" height={height} aria-hidden="true">
      {drawable.map((s, i) => (
        <path key={i} d={draw(s.points) ?? ''} fill="none" stroke={s.color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}
