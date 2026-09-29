import './BarList.css'

interface Props {
  items: { label: string; value: number; color: string; note?: string }[]
  format: (value: number) => string
}

// Ranked horizontal bars: position, name, bar on a light track, value (and an optional note, like the share)
export default function BarList({ items, format }: Props) {
  const top = Math.max(...items.map((i) => i.value), 1)
  return (
    <ol className="bar-list">
      {items.map((i, index) => (
        <li key={i.label}>
          <span className="bar-rank">{index + 1}</span>
          <span className="bar-label" title={i.label}>{i.label}</span>
          <span className="bar-track"><span style={{ width: `${(i.value / top) * 100}%`, background: i.color }} /></span>
          <span className="bar-value num">{format(i.value)}</span>
          {i.note && <span className="bar-note num">{i.note}</span>}
        </li>
      ))}
    </ol>
  )
}
