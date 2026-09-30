import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import Toggle from '../components/Toggle'
import { useLang } from '../i18n/context'
import { PERIODS, SUBJECTS, countBySubject, filterTheories, subjectLabel, theoriesFor, type Theory, type TheoryFilters } from '../lib/theories'
import './TheoriesPage.css'

type View = 'lista' | 'cartoes'

// Subject tags and authors: shared by the list rows and the cards
function Meta({ theory }: { theory: Theory }) {
  const { lang } = useLang()
  return (
    <>
      <ul className="theory-tags">
        {theory.subjects.map((s) => <li key={s} className="tag">{subjectLabel(s, lang)}</li>)}
      </ul>
      {theory.authors.length > 0 && <p className="theory-authors">{theory.authors.map((a) => a.name).join(', ')}</p>}
    </>
  )
}

export default function TheoriesPage() {
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)   // phones: filters hide behind a button
  const { t, lang } = useLang()
  const th = t.theories
  const all = theoriesFor(lang)

  // All filter state lives in the URL: ?assunto=economica,sociologica&periodo=guerra-fria&q=prebisch&vista=cartoes
  const filters: TheoryFilters = {
    subjects: params.get('assunto')?.split(',').filter(Boolean) ?? [],
    period: params.get('periodo'),
    query: params.get('q') ?? '',
  }
  const view: View = params.get('vista') === 'cartoes' ? 'cartoes' : 'lista'

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const toggleSubject = (s: string) => {
    const list = filters.subjects.includes(s) ? filters.subjects.filter((x) => x !== s) : [...filters.subjects, s]
    setParam('assunto', list.join(',') || null)
  }
  const clearAll = () => setParams(view === 'cartoes' ? { vista: 'cartoes' } : {}, { replace: true })

  const results = filterTheories(all, filters)
  const counts = countBySubject(all, filters)
  const periodLabel = PERIODS.find((p) => p.value === filters.period)?.label[lang]
  const activeCount = filters.subjects.length + (filters.period ? 1 : 0) + (filters.query ? 1 : 0)

  return (
    <>
      <header className="theories-head">
        <div className="page-head">
          <span className="kicker">{th.kicker}</span>
          <h1>{th.title}</h1>
        </div>
        <p className="theories-intro muted">{th.intro}</p>
      </header>

      <div className="theories-layout">
        {/* ---------- Filters ---------- */}
        <aside className="theories-filters">
          <button type="button" className="btn btn-secondary filters-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((o) => !o)}>
            {t.common.filters}{activeCount > 0 && ` (${activeCount})`}
          </button>

          <div className={`filters-body${filtersOpen ? ' open' : ''}`}>
            <label className="filter-group">
              <span className="kicker">{t.common.search}</span>
              <input
                type="search"
                className="input"
                value={filters.query}
                placeholder={th.searchPlaceholder}
                onChange={(e) => setParam('q', e.target.value || null)}
              />
            </label>

            <fieldset className="filter-group">
              <legend className="kicker">{th.subject}</legend>
              {Object.entries(SUBJECTS).map(([code, label]) => (
                <label key={code} className="check">
                  <input type="checkbox" checked={filters.subjects.includes(code)} onChange={() => toggleSubject(code)} />
                  <span>{label[lang]}</span>
                  <span className="muted num">{counts[code] ?? 0}</span>
                </label>
              ))}
            </fieldset>

            <fieldset className="filter-group">
              <legend className="kicker">{t.common.period}</legend>
              {[{ value: '', label: th.all }, ...PERIODS.map((p) => ({ value: p.value, label: p.label[lang] }))].map((p) => (
                <label key={p.value} className="check">
                  <input type="radio" name="periodo" checked={(filters.period ?? '') === p.value} onChange={() => setParam('periodo', p.value || null)} />
                  <span>{p.label}</span>
                </label>
              ))}
            </fieldset>
          </div>
        </aside>

        {/* ---------- Results ---------- */}
        <section className="theories-results" aria-live="polite">
          <div className="results-bar">
            <div className="results-summary">
              <span className="muted">{th.count(results.length)}</span>
              {filters.subjects.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => toggleSubject(s)}>{subjectLabel(s, lang)} ×</button>
              ))}
              {periodLabel && <button type="button" className="chip" onClick={() => setParam('periodo', null)}>{periodLabel} ×</button>}
              {filters.query && <button type="button" className="chip" onClick={() => setParam('q', null)}>“{filters.query}” ×</button>}
            </div>
            <Toggle label={t.common.view} value={view} onChange={(v) => setParam('vista', v === 'cartoes' ? v : null)}
              options={[{ value: 'lista', label: th.list }, { value: 'cartoes', label: th.cards }]} />
          </div>

          {results.length === 0 && (
            <div className="theories-empty">
              <p className="kicker">{th.emptyKicker}</p>
              <h2>{th.emptyTitle}</h2>
              <p className="muted">{th.emptyHint}</p>
              <button type="button" className="btn btn-primary" onClick={clearAll}>↺ {t.common.clearFilters}</button>
            </div>
          )}

          {view === 'lista' ? (
            <ol className="theory-list">
              {results.map((t) => (
                <li key={t.slug}>
                  <span className="theory-years">{t.yearsLabel}</span>
                  <div>
                    <h2><Link to={`/teorias/${t.slug}`}>{t.title}</Link></h2>
                    <p>{t.summary}</p>
                  </div>
                  <div className="theory-meta"><Meta theory={t} /></div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="theory-cards">
              {results.map((t) => (
                <Link key={t.slug} to={`/teorias/${t.slug}`} className="card theory-card">
                  <span className="kicker">{t.yearsLabel}</span>
                  <h2>{t.title}</h2>
                  <p>{t.summary}</p>
                  <div className="theory-card-foot"><Meta theory={t} /></div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
