interface Props<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}

// Segmented control: a row of buttons where exactly one is active
export default function Toggle<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div role="group" aria-label={label} className="seg" style={{ marginRight: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
      {options.map((o) => (
        <button key={o.value} className="seg-opt" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}