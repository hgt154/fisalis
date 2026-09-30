import { useLang } from '../i18n/context'
import { formatValue } from '../lib/format'
import { groupId, groupLabel, type Section, type View } from '../lib/indicators'
import { indicatorName } from '../lib/names'
import type { IndicatorMeta, Series } from '../lib/types'
import InfoPopover from './InfoPopover'
import Sparkline from './Sparkline'

export interface Economy {
  iso3: string
  name: string
  color: string
  series: Series | null
}

interface Props {
  view: View
  sections: Section[]
  economies: Economy[]
  fromYear: number
  toYear: number
  loading?: boolean
}

const lastPoint = (points?: [number, number][]) => (points && points.length ? points[points.length - 1] : null)

export default function IndicatorTable({ view, sections, economies, fromYear, toYear, loading = false }: Props) {
  const multi = economies.length > 1
  const { t, lang } = useLang()

  return (
    <div className="ind-table">
      <div className="ind-row ind-head kicker" aria-hidden="true">
        <span>{t.panel.indicator}</span>
        <span>{t.panel.latestValue}</span>
        <span className="ind-years"><span>{fromYear}</span><span>{toYear}</span></span>
      </div>

      {sections.map((section) => {
        const { label, kicker, color } = groupLabel(view, section.group, lang)
        const count = section.items.length
        return (
          <section key={section.group} id={groupId(section.group)} className="ind-section">
            <header className="ind-section-head">
              <h2>
                {color && <span className="sdg-square" style={{ background: color }} />}
                {kicker && <span className="kicker">{kicker}</span>}
                {label}
              </h2>
              <span className="muted">{t.panel.count(count)}</span>
            </header>

            {section.items.map((indicator) => (
              <div key={indicator.code} className={`ind-row${multi ? ' multi' : ''}`}>
                <div className="ind-name">
                  {indicatorName(indicator, lang)}
                  {indicator.description && <InfoPopover indicator={indicator} />}
                </div>
                <Values indicator={indicator} economies={economies} loading={loading} />
                <div className="ind-spark">
                  <Sparkline
                    fromYear={fromYear}
                    toYear={toYear}
                    format={(v) => formatValue(v, indicator.format)}
                    series={economies.map((e) => ({ name: e.name, color: e.color, points: e.series?.[indicator.code] ?? [] }))}
                  />
                </div>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}

// One big number for a single economy; a small colored list when comparing
function Values({ indicator, economies, loading }: { indicator: IndicatorMeta; economies: Economy[]; loading: boolean }) {
  const cells = economies.map((e) => {
    const last = lastPoint(e.series?.[indicator.code])
    return { economy: e, last, text: loading && !e.series ? '…' : formatValue(last?.[1], indicator.format) }
  })

  if (cells.length === 1) {
    const { last, text } = cells[0]
    return (
      <div className="ind-values">
        <span className={last ? 'ind-value' : 'ind-empty'}>{text}</span>
        {last && <span className="ind-year"> ({last[0]})</span>}
      </div>
    )
  }

  return (
    <ul className="ind-values ind-values-multi">
      {cells.map(({ economy, last, text }) => (
        <li key={economy.iso3} style={{ '--c': economy.color } as React.CSSProperties}>
          <span className="ind-code" title={economy.name}>{economy.iso3}</span>
          <span className={last ? 'ind-value-sm' : 'ind-empty'}>{text}</span>
          {last && <span className="ind-year"> ({last[0]})</span>}
        </li>
      ))}
    </ul>
  )
}
