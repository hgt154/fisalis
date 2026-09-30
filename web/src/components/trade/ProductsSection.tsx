import { useMemo } from 'react'
import { useLang } from '../../i18n/context'
import { formatChange, formatUsdShort, formatValue } from '../../lib/format'
import { inkOn, rowsFor, sectorColor, type Flow, type PeriodKey, type ProductRow } from '../../lib/trade'
import Treemap from '../Treemap'
import Section from './Section'

interface Props {
  products: ProductRow[]
  period: PeriodKey
  periodName: string
}

// One column: title with the total, then the treemap of that flow's products
function Column({ products, period, flow }: { products: ProductRow[]; period: PeriodKey; flow: Flow }) {
  const { t } = useLang()
  const tr = t.trade
  const rows = useMemo(() => rowsFor(products, period, flow, (r) => r.product_code), [products, period, flow])
  const total = rows.reduce((sum, r) => sum + r.value, 0)

  return (
    <div>
      <header className="products-head">
        <h3>{flow === 'export' ? tr.exported : tr.imported}</h3>
        <span className="muted num">{formatUsdShort(total)}</span>
      </header>
      <Treemap
        width={620}
        height={440}
        items={rows.map((r) => {
          const color = sectorColor(r.section_code)
          return {
            id: r.product_code,
            label: r.product,
            group: r.section_code,
            value: r.value,
            share: r.share,
            color,
            ink: inkOn(color),
            tooltip: [
              r.section,
              tr.value(formatUsdShort(r.value, 2)),
              tr.change(formatChange(r.var_pct)),
              tr.share(formatValue(r.share * 100, 'percent')),
            ],
          }
        })}
      />
    </div>
  )
}

export default function ProductsSection({ products, period, periodName }: Props) {
  const { t } = useLang()
  // Sector legend, shared by both treemaps
  const sectors = useMemo(
    () => [...new Map(products.map((r) => [r.section_code, r.section])).entries()].sort(([a], [b]) => a.localeCompare(b)),
    [products],
  )

  return (
    <Section
      id="produtos"
      title={t.trade.products}
      subtitle={t.trade.productsSubtitle(t.trade.inSentence(periodName))}
      actions={
        <ul className="trade-legend">
          {sectors.map(([code, name]) => (
            <li key={code}><span className="legend-swatch" style={{ background: sectorColor(code) }} />{name}</li>
          ))}
        </ul>
      }
    >
      <div className="products-grid">
        <Column products={products} period={period} flow="export" />
        <Column products={products} period={period} flow="import" />
      </div>
    </Section>
  )
}
