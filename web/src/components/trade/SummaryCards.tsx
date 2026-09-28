import { formatChange, formatValue } from '../../lib/format'
import type { PeriodKey, SummaryRow } from '../../lib/trade'

const CARDS: { flow: SummaryRow['flow']; title: string }[] = [
  { flow: 'export', title: 'Exportações' },
  { flow: 'import', title: 'Importações' },
  { flow: 'corrente', title: 'Corrente' },
  { flow: 'saldo', title: 'Saldo' },
]

export default function SummaryCards({ rows, period }: { rows: SummaryRow[]; period: PeriodKey }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
      {CARDS.map(({ flow, title }) => {
        const row = rows.find((r) => r.period === period && r.flow === flow)
        if (!row) return null
        const note =
          flow === 'saldo' ? (row.value >= 0 ? 'Superávit' : 'Déficit') : `${formatChange(row.var_pct)} vs. mesmo período do ano anterior`
        return (
          <div key={flow} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: 'var(--space-md)' }}>
            <div style={{ color: 'var(--color-text-muted)' }}>{title}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{formatValue(row.value, 'currency')}</div>
            <div>{note}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85em' }}>{row.label}</div>
          </div>
        )
      })}
    </div>
  )
}