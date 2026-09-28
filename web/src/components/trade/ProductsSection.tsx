// used twice, once with flow="export" and once with flow="import"

import { useMemo } from 'react'
import { formatChange, formatValue } from '../../lib/format'
import { rowsFor, sectorColor, type Flow, type PeriodKey, type ProductRow } from '../../lib/trade'
import Treemap from '../Treemap'
import Section from './Section'

interface Props {
  products: ProductRow[]
  period: PeriodKey
  flow: Flow
}

export default function ProductsSection({ products, period, flow }: Props) {
  const rows = useMemo(() => rowsFor(products, period, flow, (r) => r.product_code), [products, period, flow])
  const sections = [...new Map(rows.map((r) => [r.section_code, r.section])).entries()]

  return (
    <Section title={flow === 'export' ? 'Produtos exportados' : 'Produtos importados'}>
      <ul style={{ display: 'flex', gap: 'var(--space-md)', listStyle: 'none', padding: 0, flexWrap: 'wrap' }}>
        {sections.map(([code, name]) => (
          <li key={code}>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: sectorColor(code), marginRight: 4 }} />
            {name}
          </li>
        ))}
      </ul>
      <Treemap
        items={rows.map((r) => ({
          id: r.product_code,
          label: r.product,
          group: r.section_code,
          value: r.value,
          share: r.share,
          color: sectorColor(r.section_code),
          tooltip: [
            r.section,
            `Valor: ${formatValue(r.value, 'currency')}`,
            `Variação: ${formatChange(r.var_pct)}`,
            `Participação: ${formatValue(r.share * 100, 'percent')}`,
          ],
        }))}
      />
    </Section>
  )
}