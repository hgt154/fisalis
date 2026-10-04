import { Link, useParams } from 'react-router'
import IndicatorPanel from '../components/IndicatorPanel'
import PageIntro from '../components/PageIntro'
import { useLang } from '../i18n/context'
import { useJson } from '../lib/data'
import { formatDate, formatValue } from '../lib/format'
import { INCOME_LEVELS } from '../lib/mapColors'
import { countryName, placeName } from '../lib/names'
import type { Country, IndicatorMeta, Series } from '../lib/types'
import './CountryPage.css'

// The five figures in the band under the title (labels come from the dictionary)
const STATS = [
  { code: 'SP.POP.TOTL', key: 'population' },
  { code: 'NY.GDP.MKTP.CD', key: 'gdp' },
  { code: 'NY.GDP.PCAP.CD', key: 'gdpPc' },
  { code: 'SP.DYN.LE00.IN', key: 'life' },
  { code: 'NE.EXP.GNFS.ZS', key: 'exports' },
] as const

export default function CountryPage() {
  const { iso3 = '' } = useParams()
  const countries = useJson<Country[]>('countries.json')
  const indicators = useJson<IndicatorMeta[]>('indicators.json')
  const series = useJson<Series>(`series/${iso3}.json`)
  const meta = useJson<{ updated: string }>('meta.json')
  const { t, lang } = useLang()
  const c = t.country

  if (countries.loading || indicators.loading) return <p className="muted">{t.common.loading}</p>

  const country = countries.data?.find((c) => c.iso3 === iso3)
  if (!country || !indicators.data) {
    return <p>{c.notFound(iso3)} <Link to="/mapa">{c.backToMap}</Link></p>
  }

  const income = INCOME_LEVELS.find((l) => l.value === country.income)
  const name = countryName(country, lang)
  const formatOf = (code: string) => indicators.data?.find((i) => i.code === code)?.format ?? 'number'

  return (
    <>
      <nav className="breadcrumb" aria-label={t.common.youAreHere}>
        <Link to="/mapa">{c.map}</Link> / {c.profile}
      </nav>

      <header className="country-head">
        <div>
          <h1>{name}</h1>
          <p className="country-meta">
            <span>{placeName('region', country.region, lang)}</span>
            {income && (
              <span><span className="income-dot" style={{ background: income.color }} />{income.label[lang]}</span>
            )}
            {country.capital && <span>{c.capital(country.capital)}</span>}
          </p>
        </div>
        {country.blocs.length > 0 && (
          <ul className="country-blocs" aria-label={c.blocs}>
            {country.blocs.map((b) => (
              <li key={b}><Link className="tag" to={`/indicadores?bloco=${encodeURIComponent(b)}`}>{placeName('bloc', b, lang)}</Link></li>
            ))}
          </ul>
        )}
      </header>

      <PageIntro
        id="country"
        lead={t.intro.country.lead}
        facts={[
          { label: t.intro.source, value: t.intro.country.source },
          { label: t.intro.coverage, value: t.intro.country.coverage },
          ...(meta.data ? [{ label: t.intro.updated, value: t.intro.monthly(formatDate(meta.data.updated)) }] : []),
          { label: t.intro.note, value: t.intro.country.note },
        ]}
      />

      <dl className="country-stats">
        {STATS.map((s) => {
          const last = series.data?.[s.code]?.at(-1)
          const { label, note } = c.stats[s.key]
          return (
            <div key={s.code} className="country-stat">
              <dt className="kicker">{label}</dt>
              <dd>
                <span className="country-stat-value">{series.loading ? '…' : formatValue(last?.[1], formatOf(s.code))}</span>
                {last && <span className="ind-year"> ({last[0]})</span>}
              </dd>
              <dd className="country-stat-note">{note}</dd>
            </div>
          )
        })}
      </dl>

      <IndicatorPanel
        indicators={indicators.data}
        economies={[{ iso3, name, color: 'var(--series-1)', series: series.data }]}
        loading={series.loading}
        actions={<Link className="btn btn-ghost" to={`/indicadores?paises=${iso3}`}>{c.compare}</Link>}
      />
    </>
  )
}
