import { formatValue } from '../lib/format'
import type { Section } from '../lib/indicators'
import type { Series } from '../lib/types'
import Sparkline from './Sparkline'

export interface Economy {
  iso3: string
  name: string
  color: string
  series: Series | null
}

interface Props {
  sections: Section[]
  economies: Economy[]
  fromYear: number
  toYear: number
}

const lastPoint = (points?: [number, number][]) => (points && points.length ? points[points.length - 1] : null)

export default function IndicatorTable({ sections, economies, fromYear, toYear }: Props) {
  return (
    <>
      {sections.map((section) => (
        <section key={section.group} id={section.group}>
          <h2>{section.group}</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--color-text-muted)' }}>
                <th>Indicador</th>
                {economies.map((e) => (
                  <th key={e.iso3} style={{ textAlign: 'right', color: e.color }}>{e.name}</th>
                ))}
                <th style={{ textAlign: 'right' }}>Tendência ({fromYear}–{toYear})</th>
              </tr>
            </thead>
            <tbody>
              {section.items.map((indicator) => (
                <tr key={indicator.code} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-sm) 0' }}>
                    {indicator.name_pt}{' '}
                    {indicator.description && (
                      <span title={indicator.description} style={{ cursor: 'help', color: 'var(--color-text-muted)' }}>ⓘ</span>
                    )}
                    {indicator.source_note && (
                      <div style={{ fontSize: '0.85em', color: 'var(--color-text-muted)' }}>{indicator.source_note}</div>
                    )}
                  </td>
                  {economies.map((e) => {
                    const last = lastPoint(e.series?.[indicator.code])
                    return (
                      <td key={e.iso3} style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <strong>{formatValue(last?.[1], indicator.format)}</strong>
                        {last && <span style={{ color: 'var(--color-text-muted)' }}> ({last[0]})</span>}
                      </td>
                    )
                  })}
                  <td style={{ textAlign: 'right' }}>
                    <Sparkline
                      fromYear={fromYear}
                      toYear={toYear}
                      series={economies.map((e) => ({ color: e.color, points: e.series?.[indicator.code] ?? [] }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  )
}