// Reusable chart components

interface Props<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}

// A row of buttons where exactly one is active (like the radio buttons on Comex Vis)
export default function Toggle<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div role="group" aria-label={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)', marginRight: 'var(--space-md)' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}:</span>
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={o.value === value}
          style={{ fontWeight: o.value === value ? 700 : 400 }}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}