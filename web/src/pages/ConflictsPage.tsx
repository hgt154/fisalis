import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { Topology } from 'topojson-specification'
import BarList from '../components/BarList'
import ConflictTable from '../components/conflicts/ConflictTable'
import MilitaryEvolution from '../components/conflicts/MilitaryEvolution'
import MapLegend from '../components/MapLegend'
import PageIntro from '../components/PageIntro'
import StackedBars from '../components/StackedBars'
import Toggle from '../components/Toggle'
import Section from '../components/trade/Section'
import WorldMap from '../components/WorldMap'
import { useLang } from '../i18n/context'
import { useJson } from '../lib/data'
import { formatDate, formatShort, formatUsdShort, formatValue, getLocale, monthName } from '../lib/format'
import { toFeatures } from '../lib/geo'
import { NO_DATA_COLOR } from '../lib/mapColors'
import { countryName } from '../lib/names'
import type { Country, IndicatorMeta, LatestValue } from '../lib/types'
import {
  CONFLICT_TYPES, VIOLENCE_KINDS, activeConflicts, byRecent, normalizeConflicts, searchConflicts, typeColor, violenceColor,
  type Candidate, type Conflict, type ConflictFilter, type ConflictMap, type ConflictSummary, type ConflictType,
} from '../lib/conflicts'
import './TradePage.css'
import './ConflictsPage.css'

const ANCHORS = ['agora', 'preliminar', 'militar', 'historico'] as const
const MILITARY = ['MS.MIL.XPND.CD', 'MS.MIL.XPND.GD.ZS', 'MS.MIL.TOTL.P1', 'MS.MIL.XPRT.KD', 'MS.MIL.MPRT.KD'] as const
type MilitaryCode = (typeof MILITARY)[number]
const TOP = 15
const ACTIVE_PREVIEW = 12
const HISTORY_PAGE = 40

// Map classes: deaths in organized violence on the territory in the latest year
const DEATH_STEPS = [1, 100, 1000, 10000, 50000]
const WAR_COLORS = ['var(--war-1)', 'var(--war-2)', 'var(--war-3)', 'var(--war-4)', 'var(--war-5)']
function deathColor(total: number, conflicts: number): string {
  if (total <= 0) return conflicts > 0 ? WAR_COLORS[0] : NO_DATA_COLOR
  const step = DEATH_STEPS.findLastIndex((s) => total >= s)
  return WAR_COLORS[Math.max(step, 0)]
}

const int = (n: number) => n.toLocaleString(getLocale(), { maximumFractionDigits: 0 })

export default function ConflictsPage() {
  const { t, lang } = useLang()
  const cf = t.conflicts
  const navigate = useNavigate()

  const summary = useJson<ConflictSummary>('conflicts/summary.json')
  const conflicts = useJson<Conflict[]>('conflicts/conflicts.json')
  const conflictMap = useJson<ConflictMap>('conflicts/map.json')
  const candidate = useJson<Candidate>('conflicts/candidate.json')
  const countries = useJson<Country[]>('countries.json')
  const latest = useJson<LatestValue[]>('latest.json')
  const indicators = useJson<IndicatorMeta[]>('indicators.json')
  const topo = useJson<Topology>('world.topo.json')

  const world = useMemo(() => (topo.data ? toFeatures(topo.data) : []), [topo.data])
  const allConflicts = useMemo(() => normalizeConflicts(conflicts.data ?? []), [conflicts.data])
  const byIso = useMemo(() => new Map((countries.data ?? []).map((c) => [c.iso3, c])), [countries.data])
  const nameOf = (iso: string) => {
    const c = byIso.get(iso)
    return c ? countryName(c, lang) : iso
  }

  const [metric, setMetric] = useState<MilitaryCode>('MS.MIL.XPND.CD')
  const [milView, setMilView] = useState<'ranking' | 'evolution'>('ranking')
  const [showAllActive, setShowAllActive] = useState(false)
  const [filter, setFilter] = useState<ConflictFilter>({ query: '', type: '', activeOnly: false })
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE)

  const head = (
    <header className="trade-head">
      <div className="page-head">
        <span className="kicker">{cf.kicker}</span>
        <h1>{cf.title}</h1>
        <p className="muted">{summary.data ? cf.subtitle(summary.data.version.replace(/^(\d\d)(\d)$/, '$1.$2')) : ''}</p>
      </div>
      <nav className="trade-anchors" aria-label={t.trade.sectionsNav}>
        {ANCHORS.map((id) => <a key={id} href={`#${id}`}>{cf.anchors[id]}</a>)}
      </nav>
    </header>
  )

  const core = [summary, conflicts, conflictMap, countries]
  if (core.some((f) => f.loading)) return <>{head}<p className="muted">{cf.loading}</p></>
  const failed = core.find((f) => f.error)
  if (failed) return <>{head}<p className="note">{t.trade.loadError(failed.error?.message ?? '')}</p></>

  const s = summary.data!
  const all = allConflicts
  const version = s.version.replace(/^(\d\d)(\d)$/, '$1.$2')       // "261" -> "26.1"
  const lastDeaths = s.deaths.at(-1)

  // --- Now -------------------------------------------------------------------------------
  const active = activeConflicts(all)
  const mapRows = new Map(conflictMap.data!.countries.map((r) => [r.iso3, r]))
  const topCountries = [...conflictMap.data!.countries]
    .map((r) => ({ ...r, total: r.sb + r.ns + r.os }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // --- Military (World Bank / SIPRI, latest value per country) ---------------------------
  const meta = indicators.data?.find((i) => i.code === metric)
  const military = (latest.data ?? [])
    .filter((r) => r.code === metric && byIso.has(r.iso3))
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP)
  const formatMetric = (v: number) =>
    meta?.format === 'currency' ? formatUsdShort(v) : meta?.format === 'percent' ? formatValue(v, 'percent') : formatShort(v)

  // --- History ---------------------------------------------------------------------------
  const found = searchConflicts(all, filter, nameOf).sort(byRecent)
  const setFilterPart = (part: Partial<ConflictFilter>) => {
    setFilter({ ...filter, ...part })
    setHistoryLimit(HISTORY_PAGE)
  }

  return (
    <>
      {head}
      <PageIntro
        id="conflicts"
        lead={t.intro.conflicts.lead}
        facts={[
          { label: t.intro.source, value: t.intro.conflicts.source },
          { label: t.intro.coverage, value: t.intro.conflicts.coverage(s.first_year, s.year) },
          { label: t.intro.updated, value: t.intro.conflicts.updated },
          { label: t.intro.note, value: t.intro.conflicts.note },
        ]}
      />

      {/* ---------------------------------------------------------------- Now */}
      <Section id="agora" title={cf.nowTitle(s.year)} subtitle={cf.nowSubtitle}>
        <div className="summary-cards">
          <article className="summary-card">
            <p className="kicker">{cf.cards.active}</p>
            <p className="summary-value">{s.active}</p>
            <p className="summary-foot muted">{cf.cards.activeNote(s.active)}</p>
          </article>
          <article className="summary-card">
            <p className="kicker">{cf.cards.wars}</p>
            <p className="summary-value">{s.wars}</p>
            <p className="summary-foot muted">{cf.cards.warsNote}</p>
          </article>
          <article className="summary-card">
            <p className="kicker">{cf.cards.deaths}</p>
            <p className="summary-value">{lastDeaths ? formatShort(lastDeaths.sb) : '—'}</p>
            <p className="summary-foot muted">{lastDeaths && cf.cards.deathsNote(int(lastDeaths.sb_low), int(lastDeaths.sb_high))}</p>
          </article>
          <article className="summary-card">
            <p className="kicker">{cf.cards.countries}</p>
            <p className="summary-value">{conflictMap.data!.countries.length}</p>
            <p className="summary-foot muted">{cf.cards.countriesNote}</p>
          </article>
        </div>

        <div className="trade-split conflicts-now">
          <div>
            <WorldMap
              globe
              features={world}
              fillFor={(iso) => {
                const r = mapRows.get(iso)
                return r ? deathColor(r.sb + r.ns + r.os, r.conflicts) : NO_DATA_COLOR
              }}
              isActive={() => true}
              tooltipFor={(iso) => {
                const r = mapRows.get(iso)
                return (
                  <>
                    <strong>{nameOf(iso)}</strong>
                    {r ? (
                      <>
                        {r.conflicts > 0 && <span>{cf.activeHere(r.conflicts)}</span>}
                        {VIOLENCE_KINDS.filter((k) => r[k] > 0).map((k) => (
                          <span key={k} className="tip-row">
                            <span><span className="tip-swatch" style={{ background: violenceColor(k) }} />{cf.kinds[k]}</span>
                            <span className="num">{int(r[k])}</span>
                          </span>
                        ))}
                      </>
                    ) : <span className="muted">{cf.mapNone}</span>}
                  </>
                )
              }}
              selected={null}
              onSelect={(iso) => navigate(`/pais/${iso}#conflitos`)}
            />
            <MapLegend
              steps={{ title: cf.mapLegend, colors: WAR_COLORS, ticks: [...DEATH_STEPS.map((n) => formatShort(n, 0)), '+'] }}
              note={cf.mapClick}
            />
          </div>
          <div>
            <p className="kicker">{cf.topCountries}</p>
            <BarList
              format={int}
              items={topCountries.map((r) => ({ label: nameOf(r.iso3), value: r.total, color: deathColor(r.total, r.conflicts) }))}
            />
          </div>
        </div>

        <h3 className="conflicts-subhead">{cf.activeList}</h3>
        <ConflictTable rows={showAllActive ? active : active.slice(0, ACTIVE_PREVIEW)} mode="now" year={s.year} nameOf={nameOf} />
        {active.length > ACTIVE_PREVIEW && (
          <button className="btn btn-ghost conflicts-more" onClick={() => setShowAllActive(!showAllActive)}>
            {showAllActive ? cf.showLess : cf.showAll(active.length)}
          </button>
        )}
      </Section>

      {/* ---------------------------------------------------------------- This year (preliminary) */}
      {candidate.data && (
        <Section
          id="preliminar"
          title={cf.prelimTitle(Number(candidate.data.to.slice(0, 4)))}
          subtitle={cf.prelimSubtitle(formatDate(candidate.data.from), formatDate(candidate.data.to))}
          actions={<span className="prelim-badge">{cf.prelimBadge}</span>}
        >
          <ul className="trade-legend">
            {VIOLENCE_KINDS.map((k) => (
              <li key={k}><span className="legend-swatch" style={{ background: violenceColor(k) }} />{cf.kinds[k]}</li>
            ))}
          </ul>
          <div className="trade-split">
            <StackedBars
              rows={candidate.data.months.map((m) => ({ label: m.month, values: { sb: m.sb, ns: m.ns, os: m.os } }))}
              keys={[...VIOLENCE_KINDS]}
              colorOf={violenceColor}
              labelOf={(k) => cf.kinds[k as keyof typeof cf.kinds]}
              format={int}
              formatAxis={(v) => formatShort(v, 0)}
              tickLabel={(m) => monthName(Number(m.slice(5, 7)), 'short')}
              totalLabel={cf.total}
            />
            <div>
              <p className="kicker">{cf.prelimTop}</p>
              <BarList
                format={int}
                items={[...candidate.data.countries].sort((x, y) => y.total - x.total).slice(0, 10).map((r) => ({ label: nameOf(r.iso3), value: r.total, color: 'var(--cf-sb)' }))}
              />
            </div>
          </div>
          <p className="trade-source muted">{cf.prelimNote}</p>
        </Section>
      )}

      {/* ---------------------------------------------------------------- Military */}
      <Section
        id="militar"
        title={cf.milTitle}
        subtitle={cf.milSubtitle(TOP)}
        actions={
          <>
            <Toggle label={cf.metric} value={metric} onChange={setMetric}
              options={MILITARY.map((code) => ({ value: code, label: cf.metrics[code] }))} />
            <Toggle label={t.common.view} value={milView} onChange={setMilView}
              options={[{ value: 'ranking', label: cf.views.ranking }, { value: 'evolution', label: cf.views.evolution }]} />
          </>
        }
      >
        {milView === 'evolution' && military.length > 0 ? (
          <MilitaryEvolution
            key={metric}   // a new measure starts again from its own top 5
            code={metric}
            ranking={military.map((r) => r.iso3)}
            nameOf={nameOf}
            format={formatMetric}
            formatAxis={(v) => (meta?.format === 'percent' ? formatValue(v, 'percent') : meta?.format === 'currency' ? formatUsdShort(v, 0) : formatShort(v, 0))}
          />
        ) : military.length > 0 ? (
          <BarList
            format={formatMetric}
            items={military.map((r) => ({ label: nameOf(r.iso3), value: r.value, color: 'var(--cf-internationalized)', note: String(r.year) }))}
          />
        ) : (
          <p className="muted">{t.common.noData}</p>
        )}
        <p className="trade-source muted">
          {cf.milNote} <Link to={`/mapa?ind=${metric}`}>{cf.seeOnMap}</Link>
        </p>
      </Section>

      {/* ---------------------------------------------------------------- History */}
      <Section id="historico" title={cf.histTitle(s.first_year)} subtitle={cf.histSubtitle}>
        <div className="products-grid">
          <div>
            <h3 className="conflicts-chart-title">{cf.byTypeTitle}</h3>
            <ul className="trade-legend">
              {CONFLICT_TYPES.map((k) => (
                <li key={k}><span className="legend-swatch" style={{ background: typeColor(k) }} />{cf.types[k]}</li>
              ))}
            </ul>
            <StackedBars
              rows={s.by_type.map((r) => ({ label: String(r.year), values: Object.fromEntries(CONFLICT_TYPES.map((k) => [k, r[k]])) }))}
              keys={[...CONFLICT_TYPES]}
              colorOf={typeColor}
              labelOf={(k) => cf.types[k as ConflictType]}
              format={int}
              totalLabel={cf.total}
            />
          </div>
          <div>
            <h3 className="conflicts-chart-title">{cf.deathsTitle}</h3>
            <ul className="trade-legend">
              {VIOLENCE_KINDS.map((k) => (
                <li key={k}><span className="legend-swatch" style={{ background: violenceColor(k) }} />{cf.kinds[k]}</li>
              ))}
            </ul>
            <StackedBars
              rows={s.deaths.map((d) => ({ label: String(d.year), values: { sb: d.sb, ns: d.ns, os: d.os } }))}
              keys={[...VIOLENCE_KINDS]}
              colorOf={violenceColor}
              labelOf={(k) => cf.kinds[k as keyof typeof cf.kinds]}
              format={int}
              formatAxis={(v) => formatShort(v, 0)}
              totalLabel={cf.total}
            />
            <p className="trade-source muted">{cf.deathsSince(s.deaths[0]?.year ?? 1989)}</p>
          </div>
        </div>

        <h3 className="conflicts-subhead">{cf.listTitle}</h3>
        <div className="conflicts-filters">
          <label className="conflicts-search">
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <input
              type="search"
              aria-label={cf.searchLabel}
              placeholder={cf.searchPlaceholder}
              value={filter.query}
              onChange={(e) => setFilterPart({ query: e.target.value })}
            />
          </label>
          <select aria-label={cf.col.type} value={filter.type} onChange={(e) => setFilterPart({ type: e.target.value as ConflictType | '' })}>
            <option value="">{cf.typeAll}</option>
            {CONFLICT_TYPES.map((k) => <option key={k} value={k}>{cf.types[k]}</option>)}
          </select>
          <label className="conflicts-check">
            <input type="checkbox" checked={filter.activeOnly} onChange={(e) => setFilterPart({ activeOnly: e.target.checked })} />
            {cf.activeOnly}
          </label>
          <span className="muted num">{cf.count(found.length)}</span>
        </div>
        {found.length === 0 ? (
          <p className="muted">{cf.none}</p>
        ) : (
          <ConflictTable rows={found.slice(0, historyLimit)} mode="history" year={s.year} nameOf={nameOf} />
        )}
        {found.length > historyLimit && (
          <button className="btn btn-ghost conflicts-more" onClick={() => setHistoryLimit(historyLimit + HISTORY_PAGE)}>{cf.showMore}</button>
        )}

        <details className="conflicts-defs">
          <summary className="kicker">{cf.defsTitle}</summary>
          <dl>
            {cf.defs.map(([term, text]) => (
              <div key={term}><dt>{term}</dt><dd>{text}</dd></div>
            ))}
          </dl>
          <a href="https://www.uu.se/en/department/peace-and-conflict-research/research/ucdp/ucdp-definitions" target="_blank" rel="noreferrer">
            {cf.defsLink} ↗
          </a>
        </details>
        <p className="trade-source muted">{cf.sourceNote(version)}</p>
      </Section>
    </>
  )
}
