import { Link } from 'react-router'
import { useLang } from '../i18n/context'
import { INCOME_LEVELS } from '../lib/mapColors'
import { countryName, placeName } from '../lib/names'
import type { MapSummary } from '../lib/types'
import './MapSidePanel.css'

export interface StatRow {
  label: string
  value: string
  year?: number
}

export interface Overview {
  title: string                                       // "Mundo" or "12 países"
  note: string
  rows: StatRow[]
  income: { label: string; color: string; count: number }[]
}

interface Props {
  country: MapSummary | null   // the selected country, if any
  countryRows: StatRow[]       // its figures (already formatted)
  overview: Overview           // shown when no country is selected
  empty: { total: number } | null   // the filters match no country
  onClose: () => void
  onClear: () => void
}

function Rows({ rows }: { rows: StatRow[] }) {
  return (
    <dl className="panel-rows">
      {rows.map((r) => (
        <div key={r.label}>
          <dt>{r.label}</dt>
          <dd>
            <span className="panel-value">{r.value}</span>
            {r.year && <span className="ind-year"> ({r.year})</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default function MapSidePanel({ country, countryRows, overview, empty, onClose, onClear }: Props) {
  const { t, lang } = useLang()
  const m = t.map
  // 1. Filters with no result
  if (empty) {
    return (
      <aside className="map-panel">
        <p className="kicker">{m.noMatch(empty.total)}</p>
        <h2>{m.noMatchTitle}</h2>
        <p className="muted">{m.noMatchHint}</p>
        <button type="button" className="btn btn-primary" onClick={onClear}>↺ {t.common.clearFilters}</button>
      </aside>
    )
  }

  // 2. Nothing selected: world (or filtered group) totals
  if (!country) {
    const total = overview.income.reduce((sum, i) => sum + i.count, 0)
    return (
      <aside className="map-panel">
        <p className="kicker">{m.selected}</p>
        <h2>{overview.title}</h2>
        <p className="muted panel-note">{overview.note}</p>
        <Rows rows={overview.rows} />

        {total > 0 && (
          <div className="panel-income">
            <p className="kicker">{m.byIncome}</p>
            <div className="panel-income-bar">
              {overview.income.map((i) => (
                <span key={i.label} style={{ flexGrow: i.count, background: i.color }} title={`${i.label}: ${i.count}`} />
              ))}
            </div>
            <ul>
              {overview.income.map((i) => (
                <li key={i.label}><span>{i.label}</span><span className="num">{i.count}</span></li>
              ))}
            </ul>
          </div>
        )}

        <p className="panel-source muted">{m.source}</p>
      </aside>
    )
  }

  // 3. A country
  const income = INCOME_LEVELS.find((l) => l.value === country.income)
  return (
    <aside className="map-panel">
      <div className="panel-top">
        <p className="kicker">{m.selected}</p>
        <button type="button" className="panel-back" onClick={onClose}>{m.backToWorld}</button>
      </div>
      <h2>{countryName(country, lang)}</h2>
      <p className="panel-meta">
        <span>{placeName('region', country.region, lang)}</span>
        {income && <span><span className="income-dot" style={{ background: income.color }} />{income.label[lang]}</span>}
      </p>
      {country.blocs.length > 0 && (
        <ul className="panel-blocs">
          {country.blocs.map((b) => <li key={b} className="tag">{placeName('bloc', b, lang)}</li>)}
        </ul>
      )}
      <Rows rows={countryRows} />
      <Link className="btn btn-primary panel-cta" to={`/pais/${country.iso3}`}>{m.seeProfile}</Link>
    </aside>
  )
}
