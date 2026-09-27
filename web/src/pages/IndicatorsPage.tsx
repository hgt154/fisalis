import { useSearchParams } from 'react-router'
import GeoFilter from '../components/GeoFilter'
import { useJson } from '../lib/data'
import { applyFilters, parseFilters } from '../lib/filters'
import type { Country } from '../lib/types'

export default function IndicatorsPage() {
  const { data: countries, loading, error } = useJson<Country[]>('countries.json')
  const [params] = useSearchParams()

  if (loading) return <p>Carregando…</p>
  if (error || !countries) return <p>Erro ao carregar dados: {error?.message}</p>

  const filtered = applyFilters(countries, parseFilters(params))

  return (
    <>
      <h1>Indicadores</h1>
      <GeoFilter countries={countries} />
      <p>{filtered.length} de {countries.length} países</p>
      <ul>
        {filtered.slice(0, 20).map((c) => <li key={c.iso3}>{c.name_en} ({c.iso3})</li>)}
      </ul>
    </>
  )
}