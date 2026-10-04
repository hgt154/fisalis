import { useSearchParams } from 'react-router'
import GeoFilter from '../components/GeoFilter'
import PageIntro from '../components/PageIntro'
import IndicatorPanel from '../components/IndicatorPanel'
import type { Economy } from '../components/IndicatorTable'
import { useLang } from '../i18n/context'
import { useJson, useJsonMany } from '../lib/data'
import { parseFilters } from '../lib/filters'
import { formatDate, formatList } from '../lib/format'
import { activeGroup, aggregateFor, countriesToShow } from '../lib/indicators'
import { aggregateName, countryName, placeName } from '../lib/names'
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
  const meta = useJson<{ updated: string }>('meta.json')

  // Which economies to show: the chosen countries plus the group's aggregate, if there is one.
  // Brazil is only a fallback for a bare page (no countries, no group).
  const group = activeGroup(filters)
  const isoList = countriesToShow(filters, DEFAULT_COUNTRY, MAX_COUNTRIES)
  const aggregate = aggregateFor(filters, aggregates.data ?? [])
  const allIso = aggregate ? [...isoList, aggregate.iso3] : isoList

  const series = useJsonMany<Series>(allIso.map((iso) => `series/${iso}.json`))

  // Wait for aggregates too, otherwise a bloc page would flash "no aggregate" before they arrive
  if (countries.loading || indicators.loading || aggregates.loading) return <p className="muted">{t.common.loading}</p>
  if (!countries.data || !indicators.data) return <p>{t.common.loadError}</p>

  const nameOf = (iso: string) => {
    const c = countries.data?.find((x) => x.iso3 === iso)
    return c ? countryName(c, lang) : iso
  }
  const aggregateLabel = aggregate ? aggregateName(aggregate.name_en, lang) : ''
  const economies: Economy[] = allIso.map((iso, i) => ({
    iso3: iso,
    name: aggregate && iso === aggregate.iso3
      ? `${aggregateLabel} ${aggregate.kind === 'calculated' ? t.indicators.calculated : t.indicators.aggregate}`
      : nameOf(iso),
    color: aggregate && iso === aggregate.iso3 ? 'var(--series-aggregate)' : COLORS[i],
    series: series.data[i] ?? null,
  }))

  const comparing = economies.length > 1
  const groupLabel = group ? placeName(group.kind, group.value, lang) : ''
  const title = economies.length
    ? formatList(economies.map((e) => (e.iso3 === aggregate?.iso3 ? aggregateLabel : e.name)))
    : groupLabel

  return (
    <>
      <header className="page-head">
        <span className="kicker">{t.indicators.kicker}{comparing && t.indicators.comparison}</span>
        <h1>{title}</h1>
        <p className="muted">{t.indicators.subtitle}</p>
      </header>

      <PageIntro
        id="indicators"
        lead={t.intro.indicators.lead(indicators.data.length)}
        facts={[
          { label: t.intro.source, value: t.intro.indicators.source },
          { label: t.intro.aggregates, value: t.intro.indicators.aggregates },
          ...(meta.data ? [{ label: t.intro.updated, value: t.intro.monthly(formatDate(meta.data.updated)) }] : []),
          { label: t.intro.note, value: t.intro.indicators.note },
        ]}
      />

      <GeoFilter countries={countries.data} colors={COLORS} />

      {filters.countries.length > MAX_COUNTRIES && (
        <p className="note">{t.indicators.firstN(MAX_COUNTRIES)}</p>
      )}
      {group && !aggregate && <p className="note">{t.indicators.noAggregateFor(groupLabel)}</p>}
      {aggregate?.kind === 'calculated' && <p className="note note-info">{t.indicators.calculatedNote(aggregateLabel)}</p>}
      {series.error && <p className="note">{t.indicators.seriesError(series.error.message)}</p>}

      {economies.length > 0 && (
        <IndicatorPanel indicators={indicators.data} economies={economies} loading={series.loading} />
      )}
    </>
  )
}
