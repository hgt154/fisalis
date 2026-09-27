import { NO_DATA_COLOR } from '../lib/mapColors'

interface Props {
  items: { label: string; color: string }[]
}

export default function MapLegend({ items }: Props) {
  const all = [...items, { label: 'Sem dados', color: NO_DATA_COLOR }]
  return (
    <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', listStyle: 'none', padding: 0 }}>
      {all.map((item) => (
        <li key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <span style={{ width: 16, height: 16, background: item.color, border: '1px solid var(--color-border)' }} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}