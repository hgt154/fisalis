import { useState } from 'react'
import { formatDate, formatShort, formatUsdShort, formatValue } from '../../lib/format'
import { FLOW_LABELS, type Flow, type ProductSeries } from '../../lib/trade'
import TimeChart from '../TimeChart'
import Toggle from '../Toggle'
import Section from './Section'

export default function ProductSeriesSection({ series }: { series: ProductSeries[] }) {
  const [flow, setFlow] = useState<Flow>('export')
  const [code, setCode] = useState<string | null>(null)
  const [metric, setMetric] = useState<'fob' | 'kg'>('fob')

  const options = series.filter((s) => s.flow === flow)
  // The chosen product, or the first one of this flow (after switching flow, the old choice may not exist)
  const current = options.find((s) => s.product_code === code) ?? options[0]
  if (!current) return null

  const values = metric === 'fob' ? current.fob : current.kg
  const color = flow === 'export' ? 'var(--flow-export)' : 'var(--flow-import)'
  const range = `${formatDate(current.dates[0])} – ${formatDate(current.dates.at(-1)!)}`

  return (
    <Section
      id="produto"
      title="Série histórica por produto"
      subtitle={`${FLOW_LABELS[flow]} mensal de ${current.product.toLowerCase()} (SH4 ${current.product_code}), ${range}`}
      actions={
        <>
          <Toggle label="Fluxo" value={flow} onChange={setFlow}
            options={[{ value: 'export', label: FLOW_LABELS.export }, { value: 'import', label: FLOW_LABELS.import }]} />
          <select aria-label="Produto" className="product-select" value={current.product_code} onChange={(e) => setCode(e.target.value)}>
            {options.map((s) => <option key={s.product_code} value={s.product_code}>{s.product_code} · {s.product}</option>)}
          </select>
          <Toggle label="Métrica" value={metric} onChange={setMetric}
            options={[{ value: 'fob', label: 'US$' }, { value: 'kg', label: 'Peso (kg)' }]} />
        </>
      }
    >
      <TimeChart
        type="line"
        area
        lines={[{ name: current.product, color, points: current.dates.map((date, i) => ({ date, value: values[i] })) }]}
        format={(v) => (metric === 'fob' ? formatUsdShort(v, 2) : `${formatValue(v, 'compact')} kg`)}
        formatAxis={formatShort}
      />
    </Section>
  )
}
