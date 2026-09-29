import { useSearchParams } from 'react-router'
import GeoFilter from '../components/GeoFilter'
import IndicatorPanel from '../components/IndicatorPanel'
import type { Economy } from '../components/IndicatorTable'
import { useJson, useJsonMany } from '../lib/data'
import { parseFilters } from '../lib/filters'
import { aggregateFor } from '../lib/indicators'
import type { Aggregate, Country, IndicatorMeta, Series } from '../lib/types'

const DEFAULT_COUNTRY = 'BRA'
const MAX_COUNTRIES = 4
const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)']

// ["Brasil", "Argentina", "México"] -> "Brasil, Argentina e México"
const listFormat = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' })

export default function IndicatorsPage() {
  const [params] = useSearchParams()
  const filters = parseFilters(params)

  // --- data -----------------------------------------------------------------
  const countries = useJson<Country[]>('countries.json')
  const indicators = useJson<IndicatorMeta[]>('indicators.json')
  const aggregates = useJson<Aggregate[]>('aggregates.json')

  // Which economies to show: the chosen countries (or Brazil), plus a WB aggregate if one matches
  const isoList = (filters.countries.length ? filters.countries : [DEFAULT_COUNTRY]).slice(0, MAX_COUNTRIES)
  const aggregate = aggregateFor(filters, aggregates.data ?? [])
  const allIso = aggregate ? [...isoList, aggregate.iso3] : isoList

  const series = useJsonMany<Series>(allIso.map((iso) => `series/${iso}.json`))

  if (countries.loading || indicators.loading) return <p className="muted">Carregando…</p>
  if (!countries.data || !indicators.data) return <p>Erro ao carregar os dados.</p>

  const nameOf = (iso: string) => countries.data?.find((c) => c.iso3 === iso)?.name_en ?? iso
  const economies: Economy[] = allIso.map((iso, i) => ({
    iso3: iso,
    name: aggregate && iso === aggregate.iso3 ? `${aggregate.name_en} (agregado)` : nameOf(iso),
    color: aggregate && iso === aggregate.iso3 ? 'var(--series-aggregate)' : COLORS[i],
    series: series.data[i] ?? null,
  }))

  const comparing = economies.length > 1

  return (
    <>
      <header className="page-head">
        <span className="kicker">Indicadores{comparing && ' · Comparação'}</span>
        <h1>{listFormat.format(economies.map((e) => e.name.replace(' (agregado)', '')))}</h1>
        <p className="muted">Banco Mundial, World Development Indicators · valor mais recente e série desde 2000</p>
      </header>

      <GeoFilter countries={countries.data} colors={COLORS} />

      {filters.countries.length > MAX_COUNTRIES && (
        <p className="note">Mostrando os primeiros {MAX_COUNTRIES} países selecionados.</p>
      )}
      {(filters.bloc || filters.continent) && !aggregate && (
        <p className="note">
          Valores agregados por bloco e continente ainda não estão disponíveis. Selecione países para compará-los.
        </p>
      )}
      {series.error && <p className="note">Erro ao carregar séries: {series.error.message}</p>}

      <IndicatorPanel indicators={indicators.data} economies={economies} loading={series.loading} />
    </>
  )
}
