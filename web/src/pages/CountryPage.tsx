import { Link, useParams } from 'react-router'
import IndicatorPanel from '../components/IndicatorPanel'
import { useJson } from '../lib/data'
import { formatValue } from '../lib/format'
import { INCOME_LEVELS } from '../lib/mapColors'
import type { Country, IndicatorMeta, Series } from '../lib/types'
import './CountryPage.css'

// The five figures in the band under the title
const STATS = [
  { code: 'SP.POP.TOTL', label: 'População', note: 'habitantes' },
  { code: 'NY.GDP.MKTP.CD', label: 'PIB', note: 'US$ correntes' },
  { code: 'NY.GDP.PCAP.CD', label: 'PIB per capita', note: 'US$ correntes' },
  { code: 'SP.DYN.LE00.IN', label: 'Expectativa de vida', note: 'anos, ao nascer' },
  { code: 'NE.EXP.GNFS.ZS', label: 'Exportações', note: 'bens e serviços, % do PIB' },
]

export default function CountryPage() {
  const { iso3 = '' } = useParams()
  const countries = useJson<Country[]>('countries.json')
  const indicators = useJson<IndicatorMeta[]>('indicators.json')
  const series = useJson<Series>(`series/${iso3}.json`)

  if (countries.loading || indicators.loading) return <p className="muted">Carregando…</p>

  const country = countries.data?.find((c) => c.iso3 === iso3)
  if (!country || !indicators.data) {
    return <p>País não encontrado: {iso3}. <Link to="/mapa">Voltar ao mapa</Link></p>
  }

  const income = INCOME_LEVELS.find((l) => l.value === country.income)
  const formatOf = (code: string) => indicators.data?.find((i) => i.code === code)?.format ?? 'number'

  return (
    <>
      <nav className="breadcrumb" aria-label="Você está em">
        <Link to="/mapa">Mapa</Link> / Perfil do país
      </nav>

      <header className="country-head">
        <div>
          <h1>{country.name_en}</h1>
          <p className="country-meta">
            <span>{country.region}</span>
            {income && (
              <span><span className="income-dot" style={{ background: income.color }} />{income.label}</span>
            )}
            {country.capital && <span>Capital: {country.capital}</span>}
          </p>
        </div>
        {country.blocs.length > 0 && (
          <ul className="country-blocs" aria-label="Blocos">
            {country.blocs.map((b) => (
              <li key={b}><Link className="tag" to={`/indicadores?bloco=${encodeURIComponent(b)}`}>{b}</Link></li>
            ))}
          </ul>
        )}
      </header>

      <dl className="country-stats">
        {STATS.map((s) => {
          const last = series.data?.[s.code]?.at(-1)
          return (
            <div key={s.code} className="country-stat">
              <dt className="kicker">{s.label}</dt>
              <dd>
                <span className="country-stat-value">{series.loading ? '…' : formatValue(last?.[1], formatOf(s.code))}</span>
                {last && <span className="ind-year"> ({last[0]})</span>}
              </dd>
              <dd className="country-stat-note">{s.note}</dd>
            </div>
          )
        })}
      </dl>

      <IndicatorPanel
        indicators={indicators.data}
        economies={[{ iso3, name: country.name_en, color: 'var(--series-1)', series: series.data }]}
        loading={series.loading}
        actions={<Link className="btn btn-ghost" to={`/indicadores?paises=${iso3}`}>+ Comparar com outro país</Link>}
      />
    </>
  )
}
