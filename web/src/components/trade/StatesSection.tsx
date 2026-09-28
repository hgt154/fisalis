import { useMemo, useState } from 'react'
import { scaleQuantile } from 'd3'
import { formatValue } from '../../lib/format'
import type { CountryFeature } from '../../lib/geo'
import { NO_DATA_COLOR, SEQUENTIAL } from '../../lib/mapColors'
import { FLOW_LABELS, rowsFor, type FlowOrTotal, type PeriodKey, type StateRow } from '../../lib/trade'
import BarList from '../BarList'
import Toggle from '../Toggle'
import WorldMap from '../WorldMap'
import Section from './Section'

interface Props {
  states: StateRow[]
  period: PeriodKey
  brazil: CountryFeature[] // state shapes; `iso3` holds the state code (SP, MG...)
}

const FLOWS: { value: FlowOrTotal; label: string }[] = (['export', 'import', 'corrente'] as const).map((f) => ({ value: f, label: FLOW_LABELS[f] }))

export default function StatesSection({ states, period, brazil }: Props) {
  const [flow, setFlow] = useState<FlowOrTotal>('export')

  const rows = useMemo(() => rowsFor(states, period, flow, (r) => r.state), [states, period, flow])
  const byUf = useMemo(() => new Map(rows.filter((r) => r.uf).map((r) => [r.uf as string, r])), [rows])
  const scale = useMemo(() => scaleQuantile<string>().domain(rows.map((r) => r.value)).range(SEQUENTIAL), [rows])

  return (
    <Section title="Estados">
      <Toggle label="Fluxo" value={flow} onChange={setFlow} options={FLOWS} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-lg)' }}>
        <div style={{ flex: '1 1 380px', minWidth: 0 }}>
          <WorldMap
            features={brazil}
            fillFor={(uf) => (byUf.has(uf) ? scale(byUf.get(uf)!.value) : NO_DATA_COLOR)}
            isActive={() => true}
            tooltipFor={(uf) => {
              const r = byUf.get(uf)
              return r ? `${r.state}: ${formatValue(r.value, 'currency')}` : null
            }}
            selected={null}
            onSelect={() => {}}
          />
        </div>
        <div style={{ flex: '1 1 380px' }}>
          <h3>Estados com maior participação</h3>
          <BarList
            format={(v) => formatValue(v, 'currency')}
            items={rows.slice(0, 10).map((r) => ({ label: r.state, value: r.value, color: 'var(--flow-export)' }))}
          />
        </div>
      </div>
    </Section>
  )
}