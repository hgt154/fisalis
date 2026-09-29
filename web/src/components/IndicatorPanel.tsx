import { useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { VIEWS, buildSections, groupId, groupLabel, type View } from '../lib/indicators'
import type { IndicatorMeta } from '../lib/types'
import IndicatorTable, { type Economy } from './IndicatorTable'
import './IndicatorPanel.css'

const FROM_YEAR = 2000

interface Props {
  indicators: IndicatorMeta[]
  economies: Economy[]
  loading?: boolean
  actions?: ReactNode   // extra links on the right of the tabs (e.g. "+ Comparar")
}

// Tabs + topic filter + side index + the indicator table.
// Shared by the Indicators page and the Country page; state lives in the URL (?aba=, ?grupo=).
export default function IndicatorPanel({ indicators, economies, loading = false, actions }: Props) {
  const [params, setParams] = useSearchParams()
  const view = (params.get('aba') as View | null) ?? 'overview'
  const topic = params.get('grupo')

  const sections = useMemo(() => buildSections(indicators, view), [indicators, view])
  const visible = topic ? sections.filter((s) => s.group === topic) : sections

  // Last year with data in any loaded series (the right end of the sparklines)
  const toYear = useMemo(() => {
    const years = economies.flatMap((e) => Object.values(e.series ?? {}).map((points) => points.at(-1)?.[0] ?? 0))
    return Math.max(FROM_YEAR + 1, ...years)
  }, [economies])

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  return (
    <div className="ind-panel">
      <div className="ind-toolbar">
        <div role="tablist" aria-label="Organização dos indicadores" className="tabs">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              role="tab"
              className="tab"
              aria-selected={v.value === view}
              onClick={() => setParam({ aba: v.value === 'overview' ? null : v.value, grupo: null })}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="ind-tools">
          {economies.length > 1 && (
            <ul className="ind-legend" aria-label="Legenda">
              {economies.map((e) => (
                <li key={e.iso3} style={{ '--c': e.color } as React.CSSProperties}>{e.name}</li>
              ))}
            </ul>
          )}
          {actions}
          <select
            aria-label="Tópico"
            value={topic ?? ''}
            onChange={(e) => setParam({ grupo: e.target.value || null })}
          >
            <option value="">Tópico: Todos</option>
            {sections.map((s) => {
              const { label, kicker } = groupLabel(view, s.group)
              return <option key={s.group} value={s.group}>{kicker ? `${kicker} · ${label}` : label}</option>
            })}
          </select>
        </div>
      </div>

      <div className="ind-layout">
        <nav className="ind-index" aria-label="Neste painel">
          <p className="kicker">{view === 'sdg' ? 'Objetivos' : 'Neste painel'}</p>
          <ul>
            {visible.map((s) => {
              const { label, kicker, color } = groupLabel(view, s.group)
              return (
                <li key={s.group}>
                  <a href={`#${groupId(s.group)}`}>
                    {color && <span className="sdg-square" style={{ background: color }} />}
                    {kicker && <span className="ind-index-num">{kicker.replace('ODS ', '')}</span>}
                    <span className="ind-index-label">{label}</span>
                    <span className="ind-index-count">{s.items.length}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <IndicatorTable view={view} sections={visible} economies={economies} fromYear={FROM_YEAR} toYear={toYear} loading={loading} />
      </div>
    </div>
  )
}
