import { useMemo, useState } from 'react'
import { scaleQuantile } from 'd3'
import { formatChange, formatUsdShort, formatValue } from '../../lib/format'
import type { CountryFeature } from '../../lib/geo'
import { NO_DATA_COLOR, SEQUENTIAL } from '../../lib/mapColors'
import {
  FLOW_LABELS, continentColor, continentLabel, continentShares, inkOn, rowsFor, type FlowOrTotal, type PartnerRow, type PeriodKey,
} from '../../lib/trade'
import BarList from '../BarList'
import Toggle from '../Toggle'
import Treemap from '../Treemap'
import WorldMap from '../WorldMap'
import Section from './Section'

interface Props {
  partners: PartnerRow[]
  period: PeriodKey
  periodLabel: string
  world: CountryFeature[]
}

const FLOWS: { value: FlowOrTotal; label: string }[] = (['export', 'import', 'corrente'] as const).map((f) => ({ value: f, label: FLOW_LABELS[f] }))
const SUBTITLE: Record<FlowOrTotal, string> = {
  export: 'Destino das exportações',
  import: 'Origem das importações',
  corrente: 'Corrente de comércio (exportações + importações)',
}
const pct = (share: number) => formatValue(share * 100, 'percent')

export default function PartnersSection({ partners, period, periodLabel, world }: Props) {
  const [flow, setFlow] = useState<FlowOrTotal>('export')
  const [view, setView] = useState<'treemap' | 'map'>('treemap')

  const rows = useMemo(() => rowsFor(partners, period, flow, (r) => r.country), [partners, period, flow])
  const byIso = useMemo(() => new Map(rows.filter((r) => r.iso3).map((r) => [r.iso3 as string, r])), [rows])
  const scale = useMemo(() => scaleQuantile<string>().domain(rows.map((r) => r.value)).range(SEQUENTIAL), [rows])
  const continents = useMemo(() => continentShares(rows), [rows])

  const tooltip = (r: PartnerRow) => [
    `Valor: ${formatUsdShort(r.value, 2)}`,
    `Variação: ${formatChange(r.var_pct)}`,
    `Variação absoluta: ${formatUsdShort(r.var_abs, 2)}`,
    `Participação: ${pct(r.share)}`,
  ]

  return (
    <Section
      id="parceiros"
      title="Países parceiros"
      subtitle={`${SUBTITLE[flow]}, ${periodLabel.toLowerCase()} · agrupado por continente`}
      actions={
        <>
          <Toggle label="Fluxo" value={flow} onChange={setFlow} options={FLOWS} />
          <Toggle label="Visualização" value={view} onChange={setView}
            options={[{ value: 'treemap', label: 'Treemap' }, { value: 'map', label: 'Geográfico' }]} />
        </>
      }
    >
      <ul className="trade-legend">
        {continents.map((c) => (
          <li key={c.continent ?? 'other'}>
            <span className="legend-swatch" style={{ background: continentColor(c.continent) }} />
            {continentLabel(c.continent)} <span className="muted num">{pct(c.share)}</span>
          </li>
        ))}
      </ul>

      <div className="trade-split">
        <div>
          {view === 'treemap' ? (
            <Treemap
              width={900}
              height={520}
              items={rows.map((r) => {
                const color = continentColor(r.continent)
                return { id: r.country, label: r.country, group: continentLabel(r.continent), value: r.value, share: r.share, color, ink: inkOn(color), tooltip: tooltip(r) }
              })}
            />
          ) : (
            <WorldMap
              globe
              features={world}
              fillFor={(iso3) => (byIso.has(iso3) ? scale(byIso.get(iso3)!.value) : NO_DATA_COLOR)}
              isActive={() => true}
              tooltipFor={(iso3) => {
                const r = byIso.get(iso3)
                if (!r) return null
                return (
                  <>
                    <strong>{r.country}</strong>
                    <span>{formatUsdShort(r.value, 2)} · {pct(r.share)}</span>
                    <span className="muted">{formatChange(r.var_pct)} vs. ano anterior</span>
                  </>
                )
              }}
              selected={null}
              onSelect={() => {}}
            />
          )}
        </div>

        <div>
          <p className="kicker">Dez maiores {flow === 'import' ? 'origens' : flow === 'export' ? 'destinos' : 'parceiros'}</p>
          <BarList
            format={(v) => formatUsdShort(v)}
            items={rows.slice(0, 10).map((r) => ({ label: r.country, value: r.value, color: continentColor(r.continent), note: pct(r.share) }))}
          />
        </div>
      </div>
    </Section>
  )
}
