import { useId, useState } from 'react'
import { useLang } from '../i18n/context'
import { indicatorName } from '../lib/names'
import type { IndicatorMeta } from '../lib/types'

// The ⓘ next to an indicator name: shows the official definition on hover, focus or tap
export default function InfoPopover({ indicator }: { indicator: IndicatorMeta }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const { t, lang } = useLang()

  return (
    <span className="info" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="info-btn"
        aria-label={t.panel.definitionOf(indicatorName(indicator, lang))}
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
          <span className="kicker">{t.panel.officialDefinition}</span>
          <span className="info-text">{indicator.description}</span>
          {indicator.source_note && <span className="info-note">{indicator.source_note}</span>}
          <span className="info-code">{indicator.code} · {t.panel.wbSource}</span>
        </span>
      )}
    </span>
  )
}
