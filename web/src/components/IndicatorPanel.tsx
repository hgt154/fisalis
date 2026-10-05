import { useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { useLang } from '../i18n/context'
import { VIEWS, buildSections, countIndicators, groupId, groupLabel, searchSections, type View } from '../lib/indicators'
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
// Shared by the Indicators page and the Country page; state lives in the URL (?aba=, ?grupo=, ?busca=).
export default function IndicatorPanel({ indicators, economies, loading = false, actions }: Props) {
  const [params, setParams] = useSearchParams()
  const { t, lang } = useLang()
  const view = (params.get('aba') as View | null) ?? 'overview'
  const topic = params.get('grupo')
  const query = params.get('busca') ?? ''

  const sections = useMemo(() => buildSections(indicators, view, lang), [indicators, view, lang])
  const byTopic = topic && view !== 'all' ? sections.filter((s) => s.group === topic) : sections
  const visible = searchSections(byTopic, query)

  // While searching: how many matches the other tabs have (a search for "HIV" finds nothing
  // in the overview, but the reader should see that "By theme" has it)
  const elsewhere = query.trim()
    ? VIEWS.filter((v) => v.value !== view)
        .map((v) => ({ ...v, count: countIndicators(searchSections(buildSections(indicators, v.value, lang), query)) }))
        .filter((v) => v.count > 0)
    : []

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
        <div role="tablist" aria-label={t.panel.tabs} className="tabs">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              role="tab"
              className="tab"
              aria-selected={v.value === view}
              onClick={() => setParam({ aba: v.value === 'overview' ? null : v.value, grupo: null })}
            >
              {v.label[lang]}
            </button>
          ))}
        </div>

        <div className="ind-tools">
          <label className="ind-search">
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <input
              type="search"
              value={query}
              aria-label={t.panel.search}
              placeholder={t.panel.searchPlaceholder}
              onChange={(e) => setParam({ busca: e.target.value || null })}
            />
          </label>
          {economies.length > 1 && (
            <ul className="ind-legend" aria-label={t.panel.legend}>
              {economies.map((e) => (
                <li key={e.iso3} style={{ '--c': e.color } as React.CSSProperties}>{e.name}</li>
              ))}
            </ul>
          )}
          {actions}
          {view !== 'all' && <select
            aria-label={t.panel.topic}
            value={topic ?? ''}
            onChange={(e) => setParam({ grupo: e.target.value || null })}
          >
            <option value="">{t.panel.topicAll}</option>
            {sections.map((s) => {
              const { label, kicker } = groupLabel(view, s.group, lang)
              return <option key={s.group} value={s.group}>{kicker ? `${kicker} · ${label}` : label}</option>
            })}
          </select>}
        </div>
      </div>

      {query.trim() && (
        <div className="ind-search-bar" aria-live="polite">
          <span>{visible.length > 0 ? t.panel.found(countIndicators(visible), query.trim()) : t.panel.noResults(query.trim())}</span>
          {elsewhere.length > 0 && (
            <span className="muted">
              {t.panel.alsoIn}{' '}
              {elsewhere.map((v) => (
                <button key={v.value} type="button" className="btn btn-ghost"
                  onClick={() => setParam({ aba: v.value === 'overview' ? null : v.value, grupo: null })}>
                  {v.label[lang]} ({v.count})
                </button>
              ))}
            </span>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => setParam({ busca: null })}>× {t.panel.clearSearch}</button>
        </div>
      )}

      <div className="ind-layout">
        <nav className={`ind-index${view === 'all' ? ' ind-index-az' : ''}`} aria-label={t.panel.inThisPanel}>
          <p className="kicker">{view === 'sdg' ? t.panel.goals : view === 'all' ? t.panel.az : t.panel.inThisPanel}</p>
          <ul>
            {visible.map((s) => {
              const { label, kicker, color } = groupLabel(view, s.group, lang)
              return (
                <li key={s.group}>
                  <a href={`#${groupId(s.group)}`}>
                    {color && <span className="sdg-square" style={{ background: color }} />}
                    {kicker && <span className="ind-index-num">{kicker.replace(/\D+/, '')}</span>}
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
