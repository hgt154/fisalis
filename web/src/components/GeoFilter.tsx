// the filter bar, deliberately plain (native select and input). The Figma design will restyle it later.

import { useState } from 'react'
import { useSearchParams } from 'react-router'
import type { Country } from '../lib/types'
import { filtersToParams, options, parseFilters, type GeoFilters } from '../lib/filters'

interface Props {
  countries: Country[]
}

export default function GeoFilter({ countries }: Props) {
  const [params, setParams] = useSearchParams()
  const filters = parseFilters(params)
  const [search, setSearch] = useState('')

  const update = (changes: Partial<GeoFilters>) => setParams(filtersToParams({ ...filters, ...changes }))

  const addCountry = (name: string) => {
    const match = countries.find((c) => c.name_en.toLowerCase() === name.toLowerCase())
    if (match && !filters.countries.includes(match.iso3)) {
      update({ countries: [...filters.countries, match.iso3] })
      setSearch('')
    }
  }

  const select = (label: string, key: 'bloc' | 'continent' | 'region' | 'income', values: string[]) => (
    <label>
      {label}{' '}
      <select value={filters[key] ?? ''} onChange={(e) => update({ [key]: e.target.value || null })}>
        <option value="">Todos</option>
        {values.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
    </label>
  )

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', padding: 'var(--space-md) 0' }}>
      <label>
        País{' '}
        <input
          list="country-list"
          value={search}
          placeholder="Buscar país…"
          onChange={(e) => { setSearch(e.target.value); addCountry(e.target.value) }}
        />
        <datalist id="country-list">
          {countries.map((c) => <option key={c.iso3} value={c.name_en} />)}
        </datalist>
      </label>

      {filters.countries.map((iso) => (
        <button key={iso} onClick={() => update({ countries: filters.countries.filter((x) => x !== iso) })}>
          {countries.find((c) => c.iso3 === iso)?.name_en ?? iso} ×
        </button>
      ))}

      {select('Bloco', 'bloc', options(countries, (c) => c.blocs))}
      {select('Continente', 'continent', options(countries, (c) => c.continent))}
      {select('Região', 'region', options(countries, (c) => c.region))}
      {select('Renda', 'income', options(countries, (c) => c.income))}

      <button onClick={() => setParams(new URLSearchParams())}>Limpar filtros</button>
    </div>
  )
}