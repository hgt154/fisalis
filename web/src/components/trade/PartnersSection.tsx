import { useMemo, useState } from 'react'
import { scaleQuantile } from 'd3'
import { formatChange, formatValue } from '../../lib/format'
import type { CountryFeature } from '../../lib/geo'
import { NO_DATA_COLOR, SEQUENTIAL } from '../../lib/mapColors'
import { FLOW_LABELS, continentColor, continentLabel, rowsFor, type FlowOrTotal, type PartnerRow, type PeriodKey } from '../../lib/trade'
import BarList from '../BarList'
import Toggle from '../Toggle'
import Treemap from '../Treemap'
import WorldMap from '../WorldMap'
import Section from './Section'

interface Props {
  partners: PartnerRow[]
  period: PeriodKey
  world: CountryFeature[]
}

const FLOWS: { value: FlowOrTotal; label: string }[] = (['export', 'import', 'corrente'] as const).map((f) => ({ value: f, label: FLOW_LABELS[f] }))

export default function PartnersSection({ partners, period, world }: Props) {
  const [flow, setFlow] = useState<FlowOrTotal>('export')
  const [view, setView] = useState<'treemap' | 'map'>('treemap')

  const rows = useMemo(() => rowsFor(partners, period, flow, (r) => r.country), [partners, period, flow])
  const byIso = useMemo(() => new Map(rows.filter((r) => r.iso3).map((r) => [r.iso3 as string, r])), [rows])
  const scale = useMemo(() => scaleQuantile<string>().domain(rows.map((r) => r.value)).range(SEQUENTIAL), [rows])

  const tooltip = (r: PartnerRow) => [
    `Valor: ${formatValue(r.value, 'currency')}`,
    `Variação: ${formatChange(r.var_pct)}`,
    `Variação absoluta: ${formatValue(r.var_abs, 'currency')}`,
    `Participação: ${formatValue(r.share * 100, 'percent')}`,
  ]

  return (
    <Section title="Países parceiros">
      <Toggle label="Fluxo" value={flow} onChange={setFlow} options={FLOWS} />
      <Toggle label="Visualização" value={view} onChange={setView}
        options={[{ value: 'treemap', label: 'Treemap' }, { value: 'map', label: 'Geográfica' }]} />

      {view === 'treemap' ? (
        <Treemap
          items={rows.map((r) => ({
            id: r.country,
            label: r.country,
            group: continentLabel(r.continent),
            value: r.value,
            share: r.share,
            color: continentColor(r.continent),
            tooltip: tooltip(r),
          }))}
        />
      ) : (
        <WorldMap
          features={world}
          fillFor={(iso3) => (byIso.has(iso3) ? scale(byIso.get(iso3)!.value) : NO_DATA_COLOR)}
          isActive={() => true}
          tooltipFor={(iso3) => {
            const r = byIso.get(iso3)
            return r ? `${r.country}: ${formatValue(r.value, 'currency')} (${formatValue(r.share * 100, 'percent')})` : null
          }}
          selected={null}
          onSelect={() => {}}
        />
      )}

      <h3>Principais países parceiros</h3>
      <BarList
        format={(v) => formatValue(v, 'currency')}
        items={rows.slice(0, 10).map((r) => ({ label: r.country, value: r.value, color: continentColor(r.continent) }))}
      />
    </Section>
  )
}