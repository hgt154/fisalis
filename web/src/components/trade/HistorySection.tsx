import { useState } from 'react'
import { formatShort, formatValue } from '../../lib/format'
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
      { name: 'Exportação', color: 'var(--flow-export)', points: resample(monthly((r) => r.export), freq) },
      { name: 'Importação', color: 'var(--flow-import)', points: resample(monthly((r) => r.import), freq) },
    ]
  } else if (mode === 'corrente') {
    lines = [{ name: 'Corrente', color: 'var(--flow-total)', points: resample(monthly((r) => r.export + r.import), freq) }]
  } else {
    lines = [{ name: 'Saldo', color: 'var(--flow-balance)', points: resample(monthly((r) => r.export - r.import), freq) }]
  }

  return (
    <Section title="Série histórica">
      <Toggle label="Agregação" value={aggregation} onChange={setAggregation}
        options={[{ value: 'total', label: 'Total' }, { value: 'isic', label: 'Setores (ISIC)' }]} />
      {aggregation === 'isic' && (
        <Toggle label="Fluxo" value={flow} onChange={setFlow}
          options={[{ value: 'export', label: FLOW_LABELS.export }, { value: 'import', label: FLOW_LABELS.import }]} />
      )}

      <TimeChart lines={lines} type={type} format={(v) => formatValue(v, 'currency')} formatAxis={formatShort} />

      <Toggle label="Periodicidade" value={freq} onChange={setFreq}
        options={[{ value: 'monthly', label: 'Mensal' }, { value: 'annual', label: 'Anual' }, { value: 'ytd', label: 'Acumulado no ano' }]} />
      {aggregation === 'total' && (
        <Toggle label="Série" value={mode} onChange={setMode}
          options={[{ value: 'expimp', label: 'Exportação/Importação' }, { value: 'corrente', label: 'Corrente' }, { value: 'saldo', label: 'Saldo' }]} />
      )}
      <Toggle label="Tipo" value={type} onChange={setType}
        options={[{ value: 'line', label: 'Linha' }, { value: 'bar', label: 'Barra' }]} />
    </Section>
  )
}