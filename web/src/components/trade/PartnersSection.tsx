import { useMemo, useState } from 'react'
import { scaleQuantile } from 'd3'
import { useLang } from '../../i18n/context'
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

// Wording for the section. By default it reads from one country's point of view
// ("Destino das exportações"); the World view passes its own ("Quem mais compra").
export interface PartnerLabels {
  title: string
  flows: Record<FlowOrTotal, string>      // the three buttons
  subtitle: Record<FlowOrTotal, string>   // line under the title
  top10: Record<FlowOrTotal, string>      // heading of the ranking
  note?: string                           // optional line under the chart
}

interface Props {
  labels?: PartnerLabels
  partners: PartnerRow[]
  period: PeriodKey
  periodName: string        // "Agosto 2026" / "August 2026"
  world: CountryFeature[]
}

const pct = (share: number) => formatValue(share * 100, 'percent')

export default function PartnersSection({ labels, partners, period, periodName, world }: Props) {
  const { t, lang } = useLang()
  const tr = t.trade
  const [flow, setFlow] = useState<FlowOrTotal>('export')
  const [view, setView] = useState<'treemap' | 'map'>('treemap')

  const rows = useMemo(() => rowsFor(partners, period, flow, (r) => r.country), [partners, period, flow])
  const byIso = useMemo(() => new Map(rows.filter((r) => r.iso3).map((r) => [r.iso3 as string, r])), [rows])
  const scale = useMemo(() => scaleQuantile<string>().domain(rows.map((r) => r.value)).range(SEQUENTIAL), [rows])
  const continents = useMemo(() => continentShares(rows), [rows])

  const text: PartnerLabels = labels ?? {
    title: tr.partners,
    flows: { export: FLOW_LABELS.export[lang], import: FLOW_LABELS.import[lang], corrente: FLOW_LABELS.corrente[lang] },
    subtitle: tr.partnersSubtitle,
    top10: tr.top10,
  }
  const flows = (['export', 'import', 'corrente'] as const).map((f) => ({ value: f, label: text.flows[f] }))
  const tooltip = (r: PartnerRow) => [
    tr.value(formatUsdShort(r.value, 2)),
    tr.change(formatChange(r.var_pct)),
    tr.absChange(formatUsdShort(r.var_abs, 2)),
    tr.share(pct(r.share)),
  ]

  return (
    <Section
      id="parceiros"
      title={text.title}
      subtitle={`${text.subtitle[flow]}, ${tr.inSentence(periodName)} · ${tr.groupedByContinent}`}
      actions={
        <>
          <Toggle label={t.common.flow} value={flow} onChange={setFlow} options={flows} />
          <Toggle label={t.common.view} value={view} onChange={setView}
            options={[{ value: 'treemap', label: tr.treemap }, { value: 'map', label: tr.geographic }]} />
        </>
      }
    >
      <ul className="trade-legend">
        {continents.map((c) => (
          <li key={c.continent ?? 'other'}>
            <span className="legend-swatch" style={{ background: continentColor(c.continent) }} />
            {continentLabel(c.continent, lang)} <span className="muted num">{pct(c.share)}</span>
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
                return { id: r.country, label: r.country, group: continentLabel(r.continent, lang), value: r.value, share: r.share, color, ink: inkOn(color), tooltip: tooltip(r) }
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
                    <span className="muted">{formatChange(r.var_pct)} {tr.vsLastYear}</span>
                  </>
                )
              }}
              selected={null}
              onSelect={() => {}}
            />
          )}
        </div>

        <div>
          <p className="kicker">{text.top10[flow]}</p>
          <BarList
            format={(v) => formatUsdShort(v)}
            items={rows.slice(0, 10).map((r) => ({ label: r.country, value: r.value, color: continentColor(r.continent), note: pct(r.share) }))}
          />
        </div>
      </div>
      {text.note && <p className="trade-source muted">{text.note}</p>}
    </Section>
  )
}
