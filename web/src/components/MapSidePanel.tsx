import { Link } from 'react-router'
import { formatValue } from '../lib/format'
import { INCOME_LEVELS } from '../lib/mapColors'
import type { MapSummary } from '../lib/types'

interface Totals {
  title: string
  note?: string
  population: number | null
  gdp: number | null
}

interface Props {
  country: MapSummary | null   // the selected country, if any
  totals: Totals               // shown when no country is selected
  onClose: () => void
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 'var(--space-md)' }}>
      <div style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{value}</div>
    </div>
  )
}

export default function MapSidePanel({ country, totals, onClose }: Props) {
  if (!country) {
    return (
      <aside>
        <h2>{totals.title}</h2>
        {totals.note && <p style={{ color: 'var(--color-text-muted)' }}>{totals.note}</p>}
        <Stat label="População" value={formatValue(totals.population, 'compact')} />
        <Stat label="PIB" value={formatValue(totals.gdp, 'currency')} />
      </aside>
    )
  }

  const income = INCOME_LEVELS.find((l) => l.value === country.income)?.label ?? country.income

  return (
    <aside>
      <button onClick={onClose} aria-label="Fechar">×</button>
      <h2>{country.name_en}</h2>
      <p style={{ color: 'var(--color-text-muted)' }}>{country.region} · {income}</p>
      {country.blocs.length > 0 && (
        <p>{country.blocs.map((b) => <span key={b} style={{ marginRight: 'var(--space-sm)' }}>[{b}]</span>)}</p>
      )}
      <Stat label="População" value={formatValue(country.population, 'compact')} />
      <Stat label="PIB" value={formatValue(country.gdp, 'currency')} />
      <Stat label="PIB per capita" value={formatValue(country.gdp_pc, 'currency')} />
      <Link to={`/pais/${country.iso3}`}>Ver perfil do país →</Link>
    </aside>
  )
}