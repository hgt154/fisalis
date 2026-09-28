import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import IndicatorTable from '../components/IndicatorTable'
import { useJson } from '../lib/data'
import { buildSections } from '../lib/indicators'
import type { Country, IndicatorMeta, Series } from '../lib/types'

export default function CountryPage() {
  const { iso3 = '' } = useParams()
  const countries = useJson<Country[]>('countries.json')
  const indicators = useJson<IndicatorMeta[]>('indicators.json')
  const series = useJson<Series>(`series/${iso3}.json`)
  const sections = useMemo(() => buildSections(indicators.data ?? [], 'overview'), [indicators.data])

  if (countries.loading || indicators.loading || series.loading) return <p>Carregando…</p>

  const country = countries.data?.find((c) => c.iso3 === iso3)
  if (!country) return <p>País não encontrado: {iso3}. <Link to="/mapa">Voltar ao mapa</Link></p>

  return (
    <>
      <h1>{country.name_en}</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        {country.region} · {country.income}{country.blocs.length > 0 && ` · ${country.blocs.join(', ')}`}
      </p>
      <p>
        <Link to={`/indicadores?paises=${iso3}`}>Ver todos os indicadores e comparar →</Link>
      </p>
      <IndicatorTable
        sections={sections}
        economies={[{ iso3, name: country.name_en, color: 'var(--series-1)', series: series.data }]}
        fromYear={2000}
        toYear={new Date().getFullYear()}
      />
    </>
  )
}