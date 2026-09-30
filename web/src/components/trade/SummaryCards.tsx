import { useLang } from '../../i18n/context'
import { formatChange, formatUsdShort } from '../../lib/format'
import { periodLabel, type PeriodKey, type SummaryRow, type TradePeriod } from '../../lib/trade'

const CARDS = [
  { flow: 'export', key: 'exports', color: 'var(--flow-export)' },
  { flow: 'import', key: 'imports', color: 'var(--flow-import)' },
  { flow: 'corrente', key: 'totalTrade', color: 'var(--flow-total)' },
  { flow: 'saldo', key: 'balance', color: 'var(--flow-balance)' },
] as const

interface Props {
  rows: SummaryRow[]
  period: PeriodKey
  periodInfo: TradePeriod | undefined   // months and year of the chosen period, for "vs. agosto 2025"
}

export default function SummaryCards({ rows, period, periodInfo }: Props) {
  const { t } = useLang()
  const previous = periodInfo ? t.trade.inSentence(periodLabel(periodInfo, 1)) : ''

  return (
    <div className="summary-cards">
      {CARDS.map(({ flow, key, color }) => {
        const row = rows.find((r) => r.period === period && r.flow === flow)
        if (!row) return null
        const up = (row.var_pct ?? 0) >= 0
        return (
          <article key={flow} className="summary-card">
            <p className="kicker"><span className="summary-dot" style={{ background: color }} />{t.trade[key]}</p>
            <p className="summary-value">{formatUsdShort(row.value)}</p>
            <p className="summary-foot">
              {flow === 'saldo'
                ? <span>{row.value >= 0 ? t.trade.surplus : t.trade.deficit}</span>
                : <span className={up ? 'change-up' : 'change-down'}>{formatChange(row.var_pct)}</span>}
              <span className="muted">{t.trade.vs(flow === 'saldo' ? formatUsdShort(row.prev) : previous)}</span>
            </p>
          </article>
        )
      })}
    </div>
  )
}
