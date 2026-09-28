import { useState } from 'react'
import { formatShort, formatValue } from '../../lib/format'
import type { Flow, ProductSeries } from '../../lib/trade'
import TimeChart from '../TimeChart'
import Toggle from '../Toggle'
import Section from './Section'

interface Props {
  series: ProductSeries[]
  flow: Flow
}

export default function ProductSeriesSection({ series, flow }: Props) {
  const options = series.filter((s) => s.flow === flow)
  const [code, setCode] = useState(options[0]?.product_code ?? '')
  const [metric, setMetric] = useState<'fob' | 'kg'>('fob')

  const current = options.find((s) => s.product_code === code) ?? options[0]
  if (!current) return null

  const values = metric === 'fob' ? current.fob : current.kg
  const color = flow === 'export' ? 'var(--flow-export)' : 'var(--flow-import)'

  return (
    <Section title={flow === 'export' ? 'Série histórica de produtos exportados' : 'Série histórica de produtos importados'}>
      <label>
        Produto{' '}
        <select value={current.product_code} onChange={(e) => setCode(e.target.value)} style={{ maxWidth: '100%' }}>
          {options.map((s) => <option key={s.product_code} value={s.product_code}>{s.product}</option>)}
        </select>
      </label>
      <TimeChart
        type="line"
        lines={[{ name: current.product, color, points: current.dates.map((date, i) => ({ date, value: values[i] })) }]}
        format={(v) => (metric === 'fob' ? formatValue(v, 'currency') : `${formatValue(v, 'compact')} kg`)}
        formatAxis={formatShort}
      />
      <Toggle label="Métrica" value={metric} onChange={setMetric}
        options={[{ value: 'fob', label: 'Valor US$' }, { value: 'kg', label: 'Peso (kg)' }]} />
    </Section>
  )
}