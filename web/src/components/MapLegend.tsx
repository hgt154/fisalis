import './MapLegend.css'

interface Props {
  // Either separate categories (income groups)...
  items?: { label: string; color: string }[]
  // ...or a stepped color bar: one color per step, one label per boundary (colors.length + 1)
  steps?: { title: string; colors: string[]; ticks: string[] }
  note?: string
}

export default function MapLegend({ items, steps, note }: Props) {
  return (
    <div className="map-legend">
      {steps && (
        <figure className="legend-steps">
          <figcaption>{steps.title}</figcaption>
          <div className="legend-bar">
            {steps.colors.map((c) => <span key={c} style={{ background: c }} />)}
          </div>
          {/* Tick labels sit at the boundaries between colors */}
          <div className="legend-ticks" style={{ gridTemplateColumns: `repeat(${steps.colors.length}, 1fr)` }}>
            {steps.ticks.slice(0, -1).map((t, i) => <span key={i}>{t}</span>)}
            <span className="legend-last">{steps.ticks.at(-1)}</span>
          </div>
        </figure>
      )}

      <ul className="legend-items">
        {(items ?? []).map((item) => (
          <li key={item.label}><span className="legend-swatch" style={{ background: item.color }} />{item.label}</li>
        ))}
        <li><span className="legend-swatch legend-no-data" />Sem dados</li>
      </ul>

      {note && <p className="legend-note muted">{note}</p>}
    </div>
  )
}
