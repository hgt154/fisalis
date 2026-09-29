import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import Toggle from '../components/Toggle'
import { PERIODS, SUBJECTS, THEORIES, countBySubject, filterTheories, type Theory, type TheoryFilters } from '../lib/theories'
import './TheoriesPage.css'

type View = 'lista' | 'cartoes'

// Subject tags and authors: shared by the list rows and the cards
function Meta({ theory }: { theory: Theory }) {
  return (
    <>
      <ul className="theory-tags">
        {theory.subjects.map((s) => <li key={s} className="tag">{SUBJECTS[s] ?? s}</li>)}
      </ul>
      {theory.authors.length > 0 && <p className="theory-authors">{theory.authors.map((a) => a.name).join(', ')}</p>}
    </>
  )
}

export default function TheoriesPage() {
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)   // phones: filters hide behind a button

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

  const results = filterTheories(THEORIES, filters)
  const counts = countBySubject(THEORIES, filters)
  const periodLabel = PERIODS.find((p) => p.value === filters.period)?.label
  const activeCount = filters.subjects.length + (filters.period ? 1 : 0) + (filters.query ? 1 : 0)

  return (
    <>
      <header className="theories-head">
        <div className="page-head">
          <span className="kicker">Teorias</span>
          <h1>Uma biblioteca das Relações Internacionais</h1>
        </div>
        <p className="theories-intro muted">
          Das tradições clássicas às abordagens críticas: cada verbete resume o argumento central, os conceitos
          e os autores de referência — com leituras para ir além.
        </p>
      </header>

      <div className="theories-layout">
        {/* ---------- Filters ---------- */}
        <aside className="theories-filters">
          <button type="button" className="btn btn-secondary filters-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((o) => !o)}>
            Filtros{activeCount > 0 && ` (${activeCount})`}
          </button>

          <div className={`filters-body${filtersOpen ? ' open' : ''}`}>
            <label className="filter-group">
              <span className="kicker">Buscar</span>
              <input
                type="search"
                className="input"
                value={filters.query}
                placeholder="Ex.: Waltz, Prebisch, anarquia"
                onChange={(e) => setParam('q', e.target.value || null)}
              />
            </label>

            <fieldset className="filter-group">
              <legend className="kicker">Assunto</legend>
              {Object.entries(SUBJECTS).map(([code, label]) => (
                <label key={code} className="check">
                  <input type="checkbox" checked={filters.subjects.includes(code)} onChange={() => toggleSubject(code)} />
                  <span>{label}</span>
                  <span className="muted num">{counts[code] ?? 0}</span>
                </label>
              ))}
            </fieldset>

            <fieldset className="filter-group">
              <legend className="kicker">Período</legend>
              {[{ value: '', label: 'Todos' }, ...PERIODS].map((p) => (
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
              <span className="muted">
                {results.length} {results.length === 1 ? 'teoria' : 'teorias'} · ordenadas por período
              </span>
              {filters.subjects.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => toggleSubject(s)}>{SUBJECTS[s] ?? s} ×</button>
              ))}
              {periodLabel && <button type="button" className="chip" onClick={() => setParam('periodo', null)}>{periodLabel} ×</button>}
              {filters.query && <button type="button" className="chip" onClick={() => setParam('q', null)}>“{filters.query}” ×</button>}
            </div>
            <Toggle label="Visualização" value={view} onChange={(v) => setParam('vista', v === 'cartoes' ? v : null)}
              options={[{ value: 'lista', label: 'Lista' }, { value: 'cartoes', label: 'Cartões' }]} />
          </div>

          {results.length === 0 && (
            <div className="theories-empty">
              <p className="kicker">0 resultados</p>
              <h2>Nenhuma teoria com esses filtros</h2>
              <p className="muted">Experimente remover o período ou buscar por outro autor ou conceito.</p>
              <button type="button" className="btn btn-primary" onClick={clearAll}>↺ Limpar filtros</button>
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
