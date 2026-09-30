import { useMemo, useState } from 'react'
import { scaleQuantile } from 'd3'
import { useLang } from '../../i18n/context'
import { formatChange, formatShort, formatUsdShort, formatValue } from '../../lib/format'
import type { CountryFeature } from '../../lib/geo'
import { NO_DATA_COLOR, SEQUENTIAL } from '../../lib/mapColors'
import { FLOW_LABELS, rowsFor, type FlowOrTotal, type PeriodKey, type StateRow } from '../../lib/trade'
import BarList from '../BarList'
import MapLegend from '../MapLegend'
import Toggle from '../Toggle'
import WorldMap from '../WorldMap'
import Section from './Section'

interface Props {
  states: StateRow[]
  period: PeriodKey
  periodName: string
  brazil: CountryFeature[] // state shapes; `iso3` holds the state code (SP, MG...)
}

const pct = (share: number) => formatValue(share * 100, 'percent')

export default function StatesSection({ states, period, periodName, brazil }: Props) {
  const { t, lang } = useLang()
  const tr = t.trade
  const FLOWS = (['export', 'import', 'corrente'] as const).map((f) => ({ value: f, label: FLOW_LABELS[f][lang] }))
  const [flow, setFlow] = useState<FlowOrTotal>('export')

  const rows = useMemo(() => rowsFor(states, period, flow, (r) => r.state), [states, period, flow])
  const byUf = useMemo(() => new Map(rows.filter((r) => r.uf).map((r) => [r.uf as string, r])), [rows])
  const scale = useMemo(() => scaleQuantile<string>().domain(rows.map((r) => r.value)).range(SEQUENTIAL), [rows])

  return (
    <Section
      id="estados"
      title={tr.states}
      subtitle={tr.statesSubtitle(FLOW_LABELS[flow][lang].toLowerCase(), tr.inSentence(periodName))}
      actions={<Toggle label={t.common.flow} value={flow} onChange={setFlow} options={FLOWS} />}
    >
      <div className="trade-split states">
        <div>
          <WorldMap
            features={brazil}
            fillFor={(uf) => (byUf.has(uf) ? scale(byUf.get(uf)!.value) : NO_DATA_COLOR)}
            isActive={() => true}
            tooltipFor={(uf) => {
              const r = byUf.get(uf)
              if (!r) return null
              return (
                <>
                  <strong>{r.state}</strong>
                  <span>{formatUsdShort(r.value, 2)} · {pct(r.share)}</span>
                  <span className="muted">{formatChange(r.var_pct)} {tr.vsLastYear}</span>
                </>
              )
            }}
            selected={null}
            onSelect={() => {}}
          />
          <MapLegend
            steps={{
              title: 'US$ FOB',
              colors: scale.range(),
              ticks: [scale.domain()[0], ...scale.quantiles(), scale.domain().at(-1)!].map((v) => formatShort(v)),
            }}
          />
        </div>

        <div>
          <p className="kicker">{tr.stateRanking}</p>
          <BarList
            format={(v) => formatUsdShort(v)}
            items={rows.slice(0, 12).map((r) => ({ label: r.state, value: r.value, color: 'var(--flow-export)', note: pct(r.share) }))}
          />
        </div>
      </div>
    </Section>
  )
}
