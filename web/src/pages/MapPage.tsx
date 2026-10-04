import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { scaleQuantile } from 'd3'
import type { Topology } from 'topojson-specification'
import PageIntro from '../components/PageIntro'
import GeoFilter from '../components/GeoFilter'
import MapLegend from '../components/MapLegend'
import MapSidePanel, { type Overview, type StatRow } from '../components/MapSidePanel'
import WorldMap from '../components/WorldMap'
import { useLang } from '../i18n/context'
import { useJson } from '../lib/data'
import { FILTER_KEYS, applyFilters, parseFilters } from '../lib/filters'
import { formatDate, formatShort, formatValue } from '../lib/format'
import { toFeatures } from '../lib/geo'
import { buildSections, groupLabel } from '../lib/indicators'
import { INCOME_LEVELS, NO_DATA_COLOR, SEQUENTIAL, incomeColor } from '../lib/mapColors'
import { countryName, indicatorName } from '../lib/names'
import type { IndicatorFormat, IndicatorMeta, LatestValue, MapSummary, Series } from '../lib/types'
import './MapPage.css'

const lastPoint = (points?: [number, number][]) => (points && points.length ? points[points.length - 1] : null)
const sum = (values: (number | null)[]) => values.reduce<number>((total, v) => total + (v ?? 0), 0)

// Short labels for the legend ticks: 2 mil, 40 mil, 12,5%
const tick = (value: number, format: IndicatorFormat) =>
  format === 'percent' ? `${formatShort(value)}%` : formatShort(value)

export default function MapPage() {
  const [params, setParams] = useSearchParams()
  const selected = params.get('sel')         // ?sel=BRA  -> selected country
  const indicatorCode = params.get('ind')    // ?ind=NY.GDP.PCAP.CD -> color by indicator
  const { t, lang } = useLang()
  const m = t.map
  const s = t.country.stats

  // --- data -------------------------------------------------------------
  const summary = useJson<MapSummary[]>('map_summary.json')
  const topo = useJson<Topology>('world.topo.json')
  const world = useJson<Series>('series/WLD.json')
  const indicators = useJson<IndicatorMeta[]>('indicators.json')
  const meta = useJson<{ updated: string }>('meta.json')
  const latest = useJson<LatestValue[]>(indicatorCode ? 'latest.json' : null)  // only loaded when needed

  // --- derived values (recalculated only when their inputs change) -------
  const features = useMemo(() => (topo.data ? toFeatures(topo.data) : []), [topo.data])
  const byIso = useMemo(() => new Map((summary.data ?? []).map((c) => [c.iso3, c])), [summary.data])

  const indicator = indicators.data?.find((i) => i.code === indicatorCode) ?? null
  const values = useMemo(() => {
    const map = new Map<string, LatestValue>()
    for (const row of latest.data ?? []) if (row.code === indicatorCode && byIso.has(row.iso3)) map.set(row.iso3, row)
    return map
  }, [latest.data, indicatorCode, byIso])

  const scale = useMemo(
    () => (values.size ? scaleQuantile<string>().domain([...values.values()].map((v) => v.value)).range(SEQUENTIAL) : null),
    [values],
  )

  // "Colorir por" options, grouped like the Indicators overview; everything else under "Outros"
  const optionGroups = useMemo(() => {
    const all = indicators.data ?? []
    const groups = buildSections(all, 'overview').map((sec) => ({ label: groupLabel('overview', sec.group, lang).label, items: sec.items }))
    const used = new Set(groups.flatMap((g) => g.items.map((i) => i.code)))
    const rest = all.filter((i) => !used.has(i.code))
      .sort((a, b) => indicatorName(a, lang).localeCompare(indicatorName(b, lang), lang))
    return [...groups, { label: m.otherIndicators, items: rest }]
  }, [indicators.data, lang, m.otherIndicators])

  // --- selection and "color by" live in the URL, like the filters ----------
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }
  const clearFilters = () => {
    const next = new URLSearchParams(params)
    for (const key of FILTER_KEYS) next.delete(key)
    setParams(next)
  }

  const head = (
    <header className="map-head">
      <div className="page-head">
        <span className="kicker">{m.kicker}</span>
        <h1>{m.title}</h1>
        <p className="muted">{m.subtitle}</p>
      </div>
      <label className="map-color-by">
        <span className="muted">{m.colorBy}</span>
        <select value={indicatorCode ?? ''} onChange={(e) => setParam('ind', e.target.value || null)}>
          <option value="">{m.incomeGroup}</option>
          {optionGroups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.items.map((i) => <option key={i.code} value={i.code}>{indicatorName(i, lang)}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
    </header>
  )

  if (summary.loading || topo.loading) {
    return (
      <>
        {head}
        <div className="map-card">
          <div className="map-main"><div className="skeleton map-skeleton" /></div>
          <div className="map-side"><p className="muted">{m.loading}</p></div>
        </div>
      </>
    )
  }
  if (summary.error || topo.error || !summary.data) return <p>{m.error}</p>

  // --- filters ------------------------------------------------------------
  const filters = parseFilters(params)
  const matching = applyFilters(summary.data, filters)
  const active = new Set(matching.map((c) => c.iso3))
  const filtered = matching.length !== summary.data.length

  // --- colors and tooltip -------------------------------------------------
  const fillFor = (iso3: string) => {
    if (indicator && scale) {
      const v = values.get(iso3)
      return v === undefined ? NO_DATA_COLOR : scale(v.value)
    }
    return incomeColor(byIso.get(iso3)?.income)
  }

  const tooltipFor = (iso3: string) => {
    const country = byIso.get(iso3)
    if (!country) return null
    const income = INCOME_LEVELS.find((l) => l.value === country.income)?.label[lang]
    const row = indicator ? values.get(iso3) : null
    return (
      <>
        <strong>{countryName(country, lang)}</strong>
        {income && <span className="muted">{income}</span>}
        {indicator
          ? <span>{formatValue(row?.value, indicator.format)}{row && <span className="muted"> ({row.year})</span>}</span>
          : <span>{m.gdp(formatValue(country.gdp, 'currency'))}</span>}
      </>
    )
  }

  // --- legend -------------------------------------------------------------
  const legend = indicator && scale
    ? {
        steps: {
          title: indicatorName(indicator, lang),
          colors: scale.range(),
          ticks: [scale.domain()[0], ...scale.quantiles(), scale.domain().at(-1)!].map((v) => tick(v, indicator.format)),
        },
        note: m.quantilesNote,
      }
    : { items: INCOME_LEVELS.map((l) => ({ color: l.color, label: l.label[lang] })), note: m.incomeNote }

  // --- side panel ---------------------------------------------------------
  const selectedCountry = selected ? byIso.get(selected) ?? null : null
  const countryRows: StatRow[] = selectedCountry
    ? [
        { label: s.population.label, value: formatValue(selectedCountry.population, 'compact') },
        { label: s.gdp.label, value: formatValue(selectedCountry.gdp, 'currency') },
        { label: s.gdpPc.label, value: formatValue(selectedCountry.gdp_pc, 'currency') },
      ]
    : []
  const selectedValue = selectedCountry && indicator ? values.get(selectedCountry.iso3) : null
  if (selectedCountry && indicator && !['SP.POP.TOTL', 'NY.GDP.MKTP.CD', 'NY.GDP.PCAP.CD'].includes(indicator.code)) {
    countryRows.push({ label: indicatorName(indicator, lang), value: formatValue(selectedValue?.value, indicator.format), year: selectedValue?.year })
  }

  const worldPoint = (code: string) => lastPoint(world.data?.[code])
  const population = sum(matching.map((c) => c.population))
  const gdp = sum(matching.map((c) => c.gdp))
  const overview: Overview = filtered
    ? {
        title: m.countries(matching.length),
        note: m.sumNote,
        rows: [
          { label: s.population.label, value: formatValue(population, 'compact') },
          { label: s.gdp.label, value: formatValue(gdp, 'currency') },
          { label: s.gdpPc.label, value: formatValue(population ? gdp / population : null, 'currency') },
        ],
        income: [],
      }
    : {
        title: m.world,
        note: m.worldNote(summary.data.length),
        rows: [
          { label: s.population.label, value: formatValue(worldPoint('SP.POP.TOTL')?.[1], 'compact'), year: worldPoint('SP.POP.TOTL')?.[0] },
          { label: s.gdp.label, value: formatValue(worldPoint('NY.GDP.MKTP.CD')?.[1], 'currency'), year: worldPoint('NY.GDP.MKTP.CD')?.[0] },
          { label: s.gdpPc.label, value: formatValue(worldPoint('NY.GDP.PCAP.CD')?.[1], 'currency'), year: worldPoint('NY.GDP.PCAP.CD')?.[0] },
        ],
        income: [],
      }
  overview.income = INCOME_LEVELS.map((l) => ({
    label: l.short[lang],
    color: l.color,
    count: matching.filter((c) => c.income === l.value).length,
  }))

  const intro = (
    <PageIntro
      id="map"
      lead={t.intro.map.lead}
      facts={[
        { label: t.intro.source, value: t.intro.map.source },
        { label: t.intro.coverage, value: t.intro.map.coverage(summary.data.length) },
        ...(meta.data ? [{ label: t.intro.updated, value: t.intro.monthly(formatDate(meta.data.updated)) }] : []),
        { label: t.intro.note, value: t.intro.map.note },
      ]}
    />
  )

  return (
    <>
      {head}
      {intro}

      <GeoFilter
        countries={summary.data}
        summary={filtered ? m.economiesOf(matching.length, summary.data.length) : m.economies(summary.data.length)}
      />

      <div className="map-card">
        <div className="map-main">
          {latest.loading && <p className="map-loading muted">{m.loadingIndicator}</p>}
          <WorldMap
            globe
            features={features}
            fillFor={fillFor}
            isActive={(iso3) => !filtered || active.has(iso3)}
            tooltipFor={tooltipFor}
            selected={selected}
            onSelect={(iso3) => setParam('sel', iso3 === selected || !byIso.has(iso3) ? null : iso3)}
          />
          <MapLegend {...legend} />
        </div>

        <div className="map-side">
          <MapSidePanel
            country={selectedCountry}
            countryRows={countryRows}
            overview={overview}
            empty={matching.length === 0 ? { total: summary.data.length } : null}
            onClose={() => setParam('sel', null)}
            onClear={clearFilters}
          />
        </div>
      </div>

      <footer className="map-foot muted">
        <span>{m.borders}</span>
        <span>{m.data}{meta.data && m.updated(formatDate(meta.data.updated))}</span>
      </footer>
    </>
  )
}
