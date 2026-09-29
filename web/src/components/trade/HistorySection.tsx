import { useState } from 'react'
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

const FREQ_LABEL: Record<Frequency, string> = { monthly: 'mensais', annual: 'anuais', ytd: 'acumuladas no ano' }

export default function HistorySection({ total, isic, sectorCodes }: Props) {
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
      name: section,
      color: sectorColor(sectorCodes.get(section) ?? ''),
      points: resample(isic.filter((r) => r.flow === flow && r.section === section).map((r) => ({ date: r.date, value: r.value })), freq),
    }))
  } else if (mode === 'expimp') {
    lines = [
      { name: 'Exportações', color: 'var(--flow-export)', points: resample(monthly((r) => r.export), freq) },
      { name: 'Importações', color: 'var(--flow-import)', points: resample(monthly((r) => r.import), freq) },
    ]
  } else if (mode === 'corrente') {
    lines = [{ name: 'Corrente', color: 'var(--flow-total)', points: resample(monthly((r) => r.export + r.import), freq) }]
  } else {
    lines = [{ name: 'Saldo', color: 'var(--flow-balance)', points: resample(monthly((r) => r.export - r.import), freq) }]
  }

  const first = total[0]?.date
  const last = total.at(-1)?.date
  const what = aggregation === 'isic' ? `${FLOW_LABELS[flow]} por setor (ISIC)` : 'Exportações e importações'

  return (
    <Section
      id="serie"
      title="Série histórica"
      subtitle={`${what}, valores ${FREQ_LABEL[freq]} em US$ FOB${first && last ? `, ${formatDate(first)} – ${formatDate(last)}` : ''}`}
    >
      <div className="trade-controls">
        <Toggle label="Periodicidade" value={freq} onChange={setFreq}
          options={[{ value: 'monthly', label: 'Mensal' }, { value: 'annual', label: 'Anual' }, { value: 'ytd', label: 'Acumulado' }]} />
        {aggregation === 'total' ? (
          <Toggle label="Série" value={mode} onChange={setMode}
            options={[{ value: 'expimp', label: 'Exp. e Imp.' }, { value: 'corrente', label: 'Corrente' }, { value: 'saldo', label: 'Saldo' }]} />
        ) : (
          <Toggle label="Fluxo" value={flow} onChange={setFlow}
            options={[{ value: 'export', label: FLOW_LABELS.export }, { value: 'import', label: FLOW_LABELS.import }]} />
        )}
        <Toggle label="Tipo" value={type} onChange={setType}
          options={[{ value: 'line', label: 'Linha' }, { value: 'bar', label: 'Barra' }]} />
        <select aria-label="Agregação" value={aggregation} onChange={(e) => setAggregation(e.target.value as 'total' | 'isic')}>
          <option value="total">Total</option>
          <option value="isic">Por setor (ISIC)</option>
        </select>
      </div>

      <TimeChart lines={lines} type={type} format={(v) => formatUsdShort(v, 2)} formatAxis={formatShort} dashed={['Importações']} />
      <p className="trade-source muted">Fonte: Comex Stat/MDIC. Valores FOB em dólares correntes.</p>
    </Section>
  )
}
