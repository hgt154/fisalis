// the filter logic, kept separate from any visual component so it's easy to test and reuse on the map.
// Why keep filters in the URL: the filter state lives in the address bar, e.g. /indicadores?bloco=BRICS&paises=DEU. It is possible to bookmark it, send the link to someone, or press Back, and the page shows exactly the same view. Interviewers notice details like this

import type { Country } from './types'

export interface GeoFilters {
  countries: string[]   // ISO3 codes, e.g. ['BRA', 'ARG']
  bloc: string | null
  continent: string | null
  region: string | null
  income: string | null
}

// URL  ->  filters     (?paises=BRA,ARG&bloco=Mercosur)
export function parseFilters(params: URLSearchParams): GeoFilters {
  const list = params.get('paises')
  return {
    countries: list ? list.split(',').filter(Boolean) : [],
    bloc: params.get('bloco'),
    continent: params.get('continente'),
    region: params.get('regiao'),
    income: params.get('renda'),
  }
}

// filters  ->  URL
export function filtersToParams(filters: GeoFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.countries.length) params.set('paises', filters.countries.join(','))
  if (filters.bloc) params.set('bloco', filters.bloc)
  if (filters.continent) params.set('continente', filters.continent)
  if (filters.region) params.set('regiao', filters.region)
  if (filters.income) params.set('renda', filters.income)
  return params
}

// Which countries match the current filters?
// Selected countries always match; the other filters must ALL match.
export function applyFilters(all: Country[], filters: GeoFilters): Country[] {
  const noGroupFilter = !filters.bloc && !filters.continent && !filters.region && !filters.income
  if (noGroupFilter && filters.countries.length === 0) return all

  return all.filter((c) => {
    if (filters.countries.includes(c.iso3)) return true
    if (noGroupFilter) return false
    return (
      (!filters.bloc || c.blocs.includes(filters.bloc)) &&
      (!filters.continent || c.continent === filters.continent) &&
      (!filters.region || c.region === filters.region) &&
      (!filters.income || c.income === filters.income)
    )
  })
}

// Distinct, sorted values for a dropdown
export function options(all: Country[], pick: (c: Country) => string | string[]): string[] {
  return [...new Set(all.flatMap(pick))].filter(Boolean).sort((a, b) => a.localeCompare(b))
}