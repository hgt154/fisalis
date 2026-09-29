import { useId, useState } from 'react'
import type { IndicatorMeta } from '../lib/types'

// The ⓘ next to an indicator name: shows the official definition on hover, focus or tap
export default function InfoPopover({ indicator }: { indicator: IndicatorMeta }) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span className="info" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="info-btn"
        aria-label={`Definição: ${indicator.name_pt}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
      >
        ⓘ
      </button>
      {open && (
        <span role="tooltip" id={id} className="info-pop">
          <span className="kicker">Definição oficial</span>
          <span className="info-text">{indicator.description}</span>
          {indicator.source_note && <span className="info-note">{indicator.source_note}</span>}
          <span className="info-code">{indicator.code} · Banco Mundial, WDI</span>
        </span>
      )}
    </span>
  )
}
