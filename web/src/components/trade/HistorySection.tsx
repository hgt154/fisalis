import { useState } from 'react'
import { useLang } from '../../i18n/context'
import { formatDate, formatShort, formatUsdShort } from '../../lib/format'
import { FLOW_LABELS, resample, sectorColor, type Flow, type Frequency, type Line, type SeriesIsicRow, type SeriesTotalRow } from '../../lib/trade'
import TimeChart from '../TimeChart'
import Toggle from '../Toggle'
import Section from './Section'

type Mode = 'expimp' | 'corrente' | 'saldo'

interface Props {
  total: SeriesTotalRow[]                // monthly rows (may be empty: some economies only publish yearly data)
  annual?: SeriesTotalRow[]              // official yearly totals ("2025"); used instead of adding up the months
  isic?: SeriesIsicRow[]                 // sector breakdown (Brazil tab only)
  sectorCodes?: Map<string, string>      // section name -> code (A, B, C...), for colors
  sourceNote?: string                    // line under the chart (defaults to the Comex Stat note)
  subtitle?: (what: string, freq: string, range: string) => string   // defaults to the Comex Stat wording (US$ FOB)
}

export default function HistorySection({ total, annual, isic, sectorCodes = new Map(), sourceNote, subtitle }: Props) {
  const { t, lang } = useLang()
  const tr = t.trade
  const [aggregation, setAggregation] = useState<'total' | 'isic'>('total')
  const [chosenFreq, setFreq] = useState<Frequency>('monthly')
  const hasMonthly = total.length > 0
  const freq: Frequency = hasMonthly ? chosenFreq : 'annual'
  const [mode, setMode] = useState<Mode>('expimp')
  const [flow, setFlow] = useState<Flow>('export')
  const [type, setType] = useState<'line' | 'bar'>('line')

  // Yearly view: the official yearly totals when we have them, otherwise the months added up
  const useAnnual = freq === 'annual' && annual !== undefined && annual.length > 0
  const rows = useAnnual ? annual : total
  const series = (pick: (r: SeriesTotalRow) => number) =>
    useAnnual ? rows.map((r) => ({ date: r.date, value: pick(r) })) : resample(rows.map((r) => ({ date: r.date, value: pick(r) })), freq)

  let lines: Line[]
  if (aggregation === 'isic' && isic) {
    const sections = [...new Set(isic.map((r) => r.section))]
    lines = sections.map((section) => ({
      name: section,   // sector names come from Comex Stat (Portuguese)
      color: sectorColor(sectorCodes.get(section) ?? ''),
      points: resample(isic.filter((r) => r.flow === flow && r.section === section).map((r) => ({ date: r.date, value: r.value })), freq),
    }))
  } else if (mode === 'expimp') {
    lines = [
      { name: tr.exports, color: 'var(--flow-export)', points: series((r) => r.export) },
      { name: tr.imports, color: 'var(--flow-import)', points: series((r) => r.import) },
    ]
  } else if (mode === 'corrente') {
    lines = [{ name: tr.totalTrade, color: 'var(--flow-total)', points: series((r) => r.export + r.import) }]
  } else {
    lines = [{ name: tr.balance, color: 'var(--flow-balance)', points: series((r) => r.export - r.import) }]
  }

  const first = rows[0]?.date
  const last = rows.at(-1)?.date
  const what = aggregation === 'isic' ? tr.whatSector(FLOW_LABELS[flow][lang]) : tr.whatTotal
  const asDate = (d: string) => (d.length === 4 ? d : formatDate(d))
  const range = first && last ? `${asDate(first)} – ${asDate(last)}` : ''
  const freqOptions = hasMonthly
    ? [{ value: 'monthly' as const, label: tr.monthly }, { value: 'annual' as const, label: tr.annual }, { value: 'ytd' as const, label: tr.ytd }]
    : [{ value: 'annual' as const, label: tr.annual }]

  return (
    <Section id="serie" title={tr.history} subtitle={(subtitle ?? tr.historySubtitle)(what, tr.freqWords[freq], range)}>
      <div className="trade-controls">
        <Toggle label={tr.frequency} value={freq} onChange={setFreq} options={freqOptions} />
        {aggregation === 'total' ? (
          <Toggle label={tr.series} value={mode} onChange={setMode}
            options={[{ value: 'expimp', label: tr.expImp }, { value: 'corrente', label: tr.total }, { value: 'saldo', label: tr.balance }]} />
        ) : (
          <Toggle label={t.common.flow} value={flow} onChange={setFlow}
            options={[{ value: 'export', label: FLOW_LABELS.export[lang] }, { value: 'import', label: FLOW_LABELS.import[lang] }]} />
        )}
        <Toggle label={tr.chartType} value={type} onChange={setType}
          options={[{ value: 'line', label: tr.line }, { value: 'bar', label: tr.bar }]} />
        {isic && (
          <select aria-label={tr.breakdown} value={aggregation} onChange={(e) => setAggregation(e.target.value as 'total' | 'isic')}>
            <option value="total">{tr.breakdownTotal}</option>
            <option value="isic">{tr.bySector}</option>
          </select>
        )}
      </div>

      <TimeChart lines={lines} type={type} format={(v) => formatUsdShort(v, 2)} formatAxis={formatShort} dashed={[tr.imports]} />
      <p className="trade-source muted">{sourceNote ?? tr.sourceNote}</p>
    </Section>
  )
}
