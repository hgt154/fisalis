import { formatChange, formatUsdShort } from '../../lib/format'
import { previousLabel, type PeriodKey, type SummaryRow } from '../../lib/trade'

const CARDS: { flow: SummaryRow['flow']; title: string; color: string }[] = [
  { flow: 'export', title: 'Exportações', color: 'var(--flow-export)' },
  { flow: 'import', title: 'Importações', color: 'var(--flow-import)' },
  { flow: 'corrente', title: 'Corrente de comércio', color: 'var(--flow-total)' },
  { flow: 'saldo', title: 'Saldo', color: 'var(--flow-balance)' },
]

export default function SummaryCards({ rows, period }: { rows: SummaryRow[]; period: PeriodKey }) {
  return (
    <div className="summary-cards">
      {CARDS.map(({ flow, title, color }) => {
        const row = rows.find((r) => r.period === period && r.flow === flow)
        if (!row) return null
        const up = (row.var_pct ?? 0) >= 0
        return (
          <article key={flow} className="summary-card">
            <p className="kicker"><span className="summary-dot" style={{ background: color }} />{title}</p>
            <p className="summary-value">{formatUsdShort(row.value)}</p>
            <p className="summary-foot">
              {flow === 'saldo'
                ? <span>{row.value >= 0 ? 'Superávit' : 'Déficit'}</span>
                : <span className={up ? 'change-up' : 'change-down'}>{formatChange(row.var_pct)}</span>}
              <span className="muted">
                vs. {flow === 'saldo' ? formatUsdShort(row.prev) : previousLabel(row.label).toLowerCase()}
              </span>
            </p>
          </article>
        )
      })}
    </div>
  )
}
