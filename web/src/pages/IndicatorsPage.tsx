import { useSearchParams } from 'react-router'
import GeoFilter from '../components/GeoFilter'
import IndicatorPanel from '../components/IndicatorPanel'
import type { Economy } from '../components/IndicatorTable'
import { useLang } from '../i18n/context'
import { useJson, useJsonMany } from '../lib/data'
import { parseFilters } from '../lib/filters'
import { formatList } from '../lib/format'
import { aggregateFor } from '../lib/indicators'
import { aggregateName, countryName } from '../lib/names'
import type { Aggregate, Country, IndicatorMeta, Series } from '../lib/types'

const DEFAULT_COUNTRY = 'BRA'
const MAX_COUNTRIES = 4
const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)']

export default function IndicatorsPage() {
  const [params] = useSearchParams()
  const filters = parseFilters(params)
  const { t, lang } = useLang()

  // --- data -----------------------------------------------------------------
  const countries = useJson<Country[]>('countries.json')
  const indicators = useJson<IndicatorMeta[]>('indicators.json')
  const aggregates = useJson<Aggregate[]>('aggregates.json')

  // Which economies to show: the chosen countries (or Brazil), plus a WB aggregate if one matches
  const isoList = (filters.countries.length ? filters.countries : [DEFAULT_COUNTRY]).slice(0, MAX_COUNTRIES)
  const aggregate = aggregateFor(filters, aggregates.data ?? [])
  const allIso = aggregate ? [...isoList, aggregate.iso3] : isoList

  const series = useJsonMany<Series>(allIso.map((iso) => `series/${iso}.json`))

  if (countries.loading || indicators.loading) return <p className="muted">{t.common.loading}</p>
  if (!countries.data || !indicators.data) return <p>{t.common.loadError}</p>

  const nameOf = (iso: string) => {
    const c = countries.data?.find((x) => x.iso3 === iso)
    return c ? countryName(c, lang) : iso
  }
  const aggregateLabel = aggregate ? aggregateName(aggregate.name_en, lang) : ''
  const economies: Economy[] = allIso.map((iso, i) => ({
    iso3: iso,
    name: aggregate && iso === aggregate.iso3 ? `${aggregateLabel} ${t.indicators.aggregate}` : nameOf(iso),
    color: aggregate && iso === aggregate.iso3 ? 'var(--series-aggregate)' : COLORS[i],
    series: series.data[i] ?? null,
  }))

  const comparing = economies.length > 1

  return (
    <>
      <header className="page-head">
        <span className="kicker">{t.indicators.kicker}{comparing && t.indicators.comparison}</span>
        <h1>{formatList(economies.map((e) => (e.iso3 === aggregate?.iso3 ? aggregateLabel : e.name)))}</h1>
        <p className="muted">{t.indicators.subtitle}</p>
      </header>

      <GeoFilter countries={countries.data} colors={COLORS} />

      {filters.countries.length > MAX_COUNTRIES && (
        <p className="note">{t.indicators.firstN(MAX_COUNTRIES)}</p>
      )}
      {(filters.bloc || filters.continent) && !aggregate && (
        <p className="note">{t.indicators.noAggregate}</p>
      )}
      {series.error && <p className="note">{t.indicators.seriesError(series.error.message)}</p>}

      <IndicatorPanel indicators={indicators.data} economies={economies} loading={series.loading} />
    </>
  )
}
