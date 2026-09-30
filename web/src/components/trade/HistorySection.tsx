import { useState } from 'react'
import { useLang } from '../../i18n/context'
import { formatDate, formatShort, formatUsdShort } from '../../lib/format'
import { FLOW_LABELS, resample, sectorColor, type Flow, type Frequency, type Line, type SeriesIsicRow, type SeriesTotalRow } from '../../lib/trade'
import TimeChart from '../TimeChart'
import Toggle from '../Toggle'
import Section from './Section'

type Mode = 'expimp' | 'corrente' | 'saldo'

interface Props {
  total: SeriesTotalRow[]
  isic: SeriesIsicRow[]
  sectorCodes: Map<string, string> // section name -> code (A, B, C...), for colors
}

export default function HistorySection({ total, isic, sectorCodes }: Props) {
  const { t, lang } = useLang()
  const tr = t.trade
  const [aggregation, setAggregation] = useState<'total' | 'isic'>('total')
  const [freq, setFreq] = useState<Frequency>('monthly')
  const [mode, setMode] = useState<Mode>('expimp')
  const [flow, setFlow] = useState<Flow>('export')
  const [type, setType] = useState<'line' | 'bar'>('line')

  const monthly = (pick: (r: SeriesTotalRow) => number) => total.map((r) => ({ date: r.date, value: pick(r) }))

  let lines: Line[]
  if (aggregation === 'isic') {
    const sections = [...new Set(isic.map((r) => r.section))]
    lines = sections.map((section) => ({
      name: section,   // sector names come from Comex Stat (Portuguese)
      color: sectorColor(sectorCodes.get(section) ?? ''),
      points: resample(isic.filter((r) => r.flow === flow && r.section === section).map((r) => ({ date: r.date, value: r.value })), freq),
    }))
  } else if (mode === 'expimp') {
    lines = [
      { name: tr.exports, color: 'var(--flow-export)', points: resample(monthly((r) => r.export), freq) },
      { name: tr.imports, color: 'var(--flow-import)', points: resample(monthly((r) => r.import), freq) },
    ]
  } else if (mode === 'corrente') {
    lines = [{ name: tr.totalTrade, color: 'var(--flow-total)', points: resample(monthly((r) => r.export + r.import), freq) }]
  } else {
    lines = [{ name: tr.balance, color: 'var(--flow-balance)', points: resample(monthly((r) => r.export - r.import), freq) }]
  }

  const first = total[0]?.date
  const last = total.at(-1)?.date
  const what = aggregation === 'isic' ? tr.whatSector(FLOW_LABELS[flow][lang]) : tr.whatTotal
  const range = first && last ? `${formatDate(first)} – ${formatDate(last)}` : ''

  return (
    <Section id="serie" title={tr.history} subtitle={tr.historySubtitle(what, tr.freqWords[freq], range)}>
      <div className="trade-controls">
        <Toggle label={tr.frequency} value={freq} onChange={setFreq}
          options={[{ value: 'monthly', label: tr.monthly }, { value: 'annual', label: tr.annual }, { value: 'ytd', label: tr.ytd }]} />
        {aggregation === 'total' ? (
          <Toggle label={tr.series} value={mode} onChange={setMode}
            options={[{ value: 'expimp', label: tr.expImp }, { value: 'corrente', label: tr.total }, { value: 'saldo', label: tr.balance }]} />
        ) : (
          <Toggle label={t.common.flow} value={flow} onChange={setFlow}
            options={[{ value: 'export', label: FLOW_LABELS.export[lang] }, { value: 'import', label: FLOW_LABELS.import[lang] }]} />
        )}
        <Toggle label={tr.chartType} value={type} onChange={setType}
          options={[{ value: 'line', label: tr.line }, { value: 'bar', label: tr.bar }]} />
        <select aria-label={tr.breakdown} value={aggregation} onChange={(e) => setAggregation(e.target.value as 'total' | 'isic')}>
          <option value="total">{tr.breakdownTotal}</option>
          <option value="isic">{tr.bySector}</option>
        </select>
      </div>

      <TimeChart lines={lines} type={type} format={(v) => formatUsdShort(v, 2)} formatAxis={formatShort} dashed={[tr.imports]} />
      <p className="trade-source muted">{tr.sourceNote}</p>
    </Section>
  )
}
