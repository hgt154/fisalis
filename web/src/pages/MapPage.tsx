import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { scaleQuantile } from 'd3'
import type { Topology } from 'topojson-specification'
import GeoFilter from '../components/GeoFilter'
import MapLegend from '../components/MapLegend'
import MapSidePanel from '../components/MapSidePanel'
import WorldMap from '../components/WorldMap'
import { useJson } from '../lib/data'
import { applyFilters, parseFilters } from '../lib/filters'
import { formatValue } from '../lib/format'
import { toFeatures } from '../lib/geo'
import { INCOME_LEVELS, NO_DATA_COLOR, SEQUENTIAL, incomeColor } from '../lib/mapColors'
import type { IndicatorMeta, LatestValue, MapSummary, Series } from '../lib/types'

const lastValue = (points?: [number, number][]) => (points && points.length ? points[points.length - 1][1] : null)
const sum = (values: (number | null)[]) => values.reduce<number>((total, v) => total + (v ?? 0), 0)

export default function MapPage() {
  const [params, setParams] = useSearchParams()
  const selected = params.get('sel')         // ?sel=BRA  -> selected country
  const indicatorCode = params.get('ind')    // ?ind=NY.GDP.PCAP.CD -> color by indicator

  // --- data -------------------------------------------------------------
  const summary = useJson<MapSummary[]>('map_summary.json')
  const topo = useJson<Topology>('world.topo.json')
  const world = useJson<Series>('series/WLD.json')
  const indicators = useJson<IndicatorMeta[]>('indicators.json')
  const latest = useJson<LatestValue[]>(indicatorCode ? 'latest.json' : null)  // only loaded when needed

  // --- derived values (recalculated only when their inputs change) -------
  const features = useMemo(() => (topo.data ? toFeatures(topo.data) : []), [topo.data])
  const byIso = useMemo(() => new Map((summary.data ?? []).map((c) => [c.iso3, c])), [summary.data])

  const indicator = indicators.data?.find((i) => i.code === indicatorCode) ?? null
  const values = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of latest.data ?? []) if (row.code === indicatorCode && byIso.has(row.iso3)) map.set(row.iso3, row.value)
    return map
  }, [latest.data, indicatorCode, byIso])

  const scale = useMemo(
    () => (values.size ? scaleQuantile<string>().domain([...values.values()]).range(SEQUENTIAL) : null),
    [values],
  )

  if (summary.loading || topo.loading) return <p>Carregando mapa…</p>
  if (summary.error || topo.error || !summary.data) return <p>Erro ao carregar o mapa.</p>

  // --- filters ------------------------------------------------------------
  const filters = parseFilters(params)
  const matching = applyFilters(summary.data, filters)
  const active = new Set(matching.map((c) => c.iso3))
  const filtered = matching.length !== summary.data.length

  // --- colors and tooltip -------------------------------------------------
  const fillFor = (iso3: string) => {
    if (indicator && scale) {
      const v = values.get(iso3)
      return v === undefined ? NO_DATA_COLOR : scale(v)
    }
    return incomeColor(byIso.get(iso3)?.income)
  }

  const tooltipFor = (iso3: string) => {
    const country = byIso.get(iso3)
    if (!country) return null
    const value = indicator ? formatValue(values.get(iso3), indicator.format) : formatValue(country.gdp, 'currency')
    return `${country.name_en}: ${value}`
  }

  const legendItems =
    indicator && scale
      ? scale.range().map((color) => {
          const [from, to] = scale.invertExtent(color)
          return { color, label: `${formatValue(from, indicator.format)} – ${formatValue(to, indicator.format)}` }
        })
      : INCOME_LEVELS

  // --- selection lives in the URL, like the filters ------------------------
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }
  const onSelect = (iso3: string) => setParam('sel', iso3 === selected || !byIso.has(iso3) ? null : iso3)

  const totals = filtered
    ? {
        title: `${matching.length} países selecionados`,
        note: 'Soma do valor mais recente de cada país',
        population: sum(matching.map((c) => c.population)),
        gdp: sum(matching.map((c) => c.gdp)),
      }
    : {
        title: 'Mundo',
        population: lastValue(world.data?.['SP.POP.TOTL']),
        gdp: lastValue(world.data?.['NY.GDP.MKTP.CD']),
      }

  return (
    <>
      <h1>Mapa</h1>
      <GeoFilter countries={summary.data} />

      <label>
        Colorir por{' '}
        <select value={indicatorCode ?? ''} onChange={(e) => setParam('ind', e.target.value || null)}>
          <option value="">Grupo de renda</option>
          {(indicators.data ?? []).map((i) => (
            <option key={i.code} value={i.code}>{i.name_pt}</option>
          ))}
        </select>
      </label>
      {latest.loading && <span> carregando indicador…</span>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-lg)', marginTop: 'var(--space-md)' }}>
        <div style={{ flex: '3 1 600px', minWidth: 0 }}>
          <WorldMap
            features={features}
            fillFor={fillFor}
            isActive={(iso3) => !filtered || active.has(iso3)}
            tooltipFor={tooltipFor}
            selected={selected}
            onSelect={onSelect}
          />
          <MapLegend items={legendItems} />
        </div>
        <div style={{ flex: '1 1 260px' }}>
          <MapSidePanel country={selected ? byIso.get(selected) ?? null : null} totals={totals} onClose={() => setParam('sel', null)} />
        </div>
      </div>
    </>
  )
}