import { Link, useSearchParams } from 'react-router'
import HistoryTimeline from '../components/history/HistoryTimeline'
import Toggle from '../components/Toggle'
import { useDurationLabel } from '../components/history/useDurationLabel'
import { useLang } from '../i18n/context'
import { useJson } from '../lib/data'
import { HISTORY_COUNTRIES, eraOf, filterRulers, historyOf, regimeColor, yearsLabel, type Ruler } from '../lib/history'
import { countryName } from '../lib/names'
import type { Country } from '../lib/types'
import './TheoriesPage.css'
import './HistoryPage.css'

type View = 'lista' | 'cartoes'

function Badges({ ruler }: { ruler: Ruler }) {
  const { t } = useLang()
  return (
    <ul className="hist-badges">
      <li className="tag"><i style={{ background: regimeColor(ruler.regime) }} aria-hidden="true" />{t.history.regimes[ruler.regime]}</li>
      <li className="tag">{t.history.access[ruler.access]}</li>
      {!ruler.article && <li className="tag tag-muted">{t.history.textSoon}</li>}
    </ul>
  )
}

export default function HistoryPage() {
  const [params, setParams] = useSearchParams()
  const { t, lang } = useLang()
  const h = t.history
  const countries = useJson<Country[]>('countries.json')
  const durationLabel = useDurationLabel()

  // State in the URL: ?pais=ARG&periodo=1976&q=malvinas&vista=cartoes
  const iso3 = HISTORY_COUNTRIES.some((c) => c.iso3 === params.get('pais')) ? params.get('pais')! : HISTORY_COUNTRIES[0].iso3
  const soon = HISTORY_COUNTRIES.find((c) => c.iso3 === iso3)?.soon ?? false
  const eraParam = params.get('periodo')
  const query = params.get('q') ?? ''
  const view: View = params.get('vista') === 'cartoes' ? 'cartoes' : 'lista'

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  const nameOf = (code: string) => {
    const c = countries.data?.find((x) => x.iso3 === code)
    return c ? countryName(c, lang) : code
  }

  const history = soon ? null : historyOf(iso3, lang)
  const era = history?.eras.find((e) => String(e.from) === eraParam) ?? null
  const results = history ? filterRulers(history.rulers, history.eras, { era: era?.from ?? null, query }) : []
  const written = history?.rulers.filter((r) => r.article).length ?? 0
  const summaryOf = (r: Ruler) => r.article?.summary ?? r.note ?? ''
  const link = (r: Ruler) => `/historia/${r.iso3}/${r.slug}`

  return (
    <>
      <header className="theories-head">
        <div className="page-head">
          <span className="kicker">{h.kicker}</span>
          <h1>{h.title}</h1>
        </div>
        <p className="theories-intro muted">{h.intro}</p>
      </header>

      {/* ---------- Countries ---------- */}
      <nav className="hist-countries" aria-label={h.countries}>
        {HISTORY_COUNTRIES.map((c) => (
          <button
            key={c.iso3}
            type="button"
            className="hist-country"
            aria-pressed={c.iso3 === iso3}
            onClick={() => setParam({ pais: c.iso3 === HISTORY_COUNTRIES[0].iso3 ? null : c.iso3, periodo: null, q: null })}
          >
            {nameOf(c.iso3)}
            {c.soon && <span className="hist-soon">{h.soon}</span>}
          </button>
        ))}
      </nav>

      {soon || !history ? (
        <div className="theories-empty">
          <p className="kicker">{h.soon}</p>
          <h2>{h.soonText(nameOf(iso3))}</h2>
        </div>
      ) : (
        <>
          <section className="hist-timeline-wrap" aria-label={h.timeline}>
            <HistoryTimeline rulers={history.rulers} eras={history.eras} />
            <p className="muted hist-regime-note">{h.regimeNote}</p>
          </section>

          <div className="theories-layout">
            {/* ---------- Filters ---------- */}
            <aside className="theories-filters">
              <div className="filters-body open">
                <label className="filter-group">
                  <span className="kicker">{t.common.search}</span>
                  <input type="search" className="input" value={query} placeholder={h.searchPlaceholder}
                    onChange={(e) => setParam({ q: e.target.value || null })} />
                </label>

                <fieldset className="filter-group">
                  <legend className="kicker">{h.era}</legend>
                  {[{ value: '', label: h.allEras, count: history.rulers.length },
                    ...history.eras.map((e) => ({
                      value: String(e.from),
                      label: `${e.name[lang]} (${e.from}–${e.to ?? ''})`,
                      count: history.rulers.filter((r) => eraOf(r, history.eras)?.from === e.from).length,
                    }))]
                    .filter((o) => o.count > 0)
                    .map((o) => (
                      <label key={o.value} className="check">
                        <input type="radio" name="periodo" checked={(eraParam && era ? eraParam : '') === o.value}
                          onChange={() => setParam({ periodo: o.value || null })} />
                        <span>{o.label}</span>
                        <span className="muted num">{o.count}</span>
                      </label>
                    ))}
                </fieldset>
              </div>
            </aside>

            {/* ---------- Results ---------- */}
            <section className="theories-results" aria-live="polite">
              <div className="results-bar">
                <div className="results-summary">
                  <span className="muted">{h.count(results.length)} · {h.withText(written)}</span>
                  {era && <button type="button" className="chip" onClick={() => setParam({ periodo: null })}>{era.name[lang]} ×</button>}
                  {query && <button type="button" className="chip" onClick={() => setParam({ q: null })}>“{query}” ×</button>}
                </div>
                <Toggle label={t.common.view} value={view} onChange={(v) => setParam({ vista: v === 'cartoes' ? v : null })}
                  options={[{ value: 'lista', label: t.theories.list }, { value: 'cartoes', label: t.theories.cards }]} />
              </div>

              {results.length === 0 && (
                <div className="theories-empty">
                  <h2>{h.emptyTitle}</h2>
                  <button type="button" className="btn btn-primary" onClick={() => setParam({ periodo: null, q: null })}>↺ {h.clear}</button>
                </div>
              )}

              {view === 'lista' ? (
                <ol className="hist-list">
                  {results.map((r) => (
                    <li key={r.slug} className={r.article ? '' : 'no-text'}>
                      <span className="hist-years num">{yearsLabel(r)}</span>
                      <div>
                        <h2><Link to={link(r)}>{r.name}</Link>{r.party && <span className="hist-party"> · {r.party}</span>}</h2>
                        <p>{summaryOf(r)}</p>
                        <Badges ruler={r} />
                      </div>
                      <span className="hist-duration muted">{r.end ? durationLabel(r) : h.inOffice}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="theory-cards">
                  {results.map((r) => (
                    <Link key={r.slug} to={link(r)} className={`card theory-card hist-card${r.article ? '' : ' no-text'}`}
                      style={{ borderTopColor: regimeColor(r.regime) }}>
                      <span className="kicker">{yearsLabel(r)} · {r.end ? durationLabel(r) : h.inOffice}</span>
                      <h2>{r.name}</h2>
                      <p>{summaryOf(r)}</p>
                      <div className="theory-card-foot"><Badges ruler={r} /></div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  )
}
