import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import GeoFilter from '../components/GeoFilter'
import IndicatorTable, { type Economy } from '../components/IndicatorTable'
import { useJson, useJsonMany } from '../lib/data'
import { parseFilters } from '../lib/filters'
import { VIEWS, aggregateFor, buildSections, type View } from '../lib/indicators'
import type { Aggregate, Country, IndicatorMeta, Series } from '../lib/types'

const DEFAULT_COUNTRY = 'BRA'
const MAX_COUNTRIES = 4
const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)']
const FROM_YEAR = 2000
const TO_YEAR = new Date().getFullYear()

export default function IndicatorsPage() {
  const [params, setParams] = useSearchParams()
  const filters = parseFilters(params)
  const view = (params.get('aba') as View | null) ?? 'overview'   // ?aba=sdg
  const topic = params.get('grupo')                                // ?grupo=Social

  // --- data -----------------------------------------------------------------
  const countries = useJson<Country[]>('countries.json')
  const indicators = useJson<IndicatorMeta[]>('indicators.json')
  const aggregates = useJson<Aggregate[]>('aggregates.json')

  // Which economies to show: the chosen countries (or Brazil), plus a WB aggregate if one matches
  const isoList = (filters.countries.length ? filters.countries : [DEFAULT_COUNTRY]).slice(0, MAX_COUNTRIES)
  const aggregate = aggregateFor(filters, aggregates.data ?? [])
  const allIso = aggregate ? [...isoList, aggregate.iso3] : isoList

  const series = useJsonMany<Series>(allIso.map((iso) => `series/${iso}.json`))
  const sections = useMemo(() => buildSections(indicators.data ?? [], view), [indicators.data, view])

  if (countries.loading || indicators.loading) return <p>Carregando…</p>
  if (!countries.data || !indicators.data) return <p>Erro ao carregar os dados.</p>

  const nameOf = (iso: string) => countries.data?.find((c) => c.iso3 === iso)?.name_en ?? iso
  const economies: Economy[] = allIso.map((iso, i) => ({
    iso3: iso,
    name: aggregate && iso === aggregate.iso3 ? `${aggregate.name_en} (agregado)` : nameOf(iso),
    color: aggregate && iso === aggregate.iso3 ? 'var(--series-aggregate)' : COLORS[i],
    series: series.data[i] ?? null,
  }))

  const visibleSections = topic ? sections.filter((s) => s.group === topic) : sections

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next)
  }

  return (
    <>
      <h1>Indicadores</h1>
      <GeoFilter countries={countries.data} />

      {filters.countries.length > MAX_COUNTRIES && (
        <p>Mostrando os primeiros {MAX_COUNTRIES} países selecionados.</p>
      )}
      {(filters.bloc || filters.continent) && !aggregate && (
        <p style={{ color: 'var(--color-text-muted)' }}>
          Valores agregados por bloco e continente ainda não estão disponíveis. Selecione países para compará-los.
        </p>
      )}

      <nav role="tablist" style={{ display: 'flex', gap: 'var(--space-sm)', margin: 'var(--space-md) 0' }}>
        {VIEWS.map((v) => (
          <button
            key={v.value}
            role="tab"
            aria-selected={v.value === view}
            style={{ fontWeight: v.value === view ? 700 : 400 }}
            onClick={() => setParam({ aba: v.value === 'overview' ? null : v.value, grupo: null })}
          >
            {v.label}
          </button>
        ))}
      </nav>

      <label>
        Tópico{' '}
        <select value={topic ?? ''} onChange={(e) => setParam({ grupo: e.target.value || null })}>
          <option value="">Todos</option>
          {sections.map((s) => <option key={s.group} value={s.group}>{s.group}</option>)}
        </select>
      </label>

      {series.loading && <p>Carregando séries…</p>}
      {series.error && <p>Erro ao carregar séries: {series.error.message}</p>}

      <IndicatorTable sections={visibleSections} economies={economies} fromYear={FROM_YEAR} toYear={TO_YEAR} />
    </>
  )
}