// the top-10 rankings. Plain HTML, no D3 needed.

interface Props {
  items: { label: string; value: number; color: string }[]
  format: (value: number) => string
}

// Horizontal ranking bars ("Principais países parceiros", "Estados com maior participação")
export default function BarList({ items, format }: Props) {
  const top = Math.max(...items.map((i) => i.value), 1)
  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {items.map((i) => (
        <li key={i.label} style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.label}</span>
          <span style={{ background: i.color, height: 18, width: `${(i.value / top) * 100}%` }} />
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{format(i.value)}</span>
        </li>
      ))}
    </ol>
  )
}