import { describe, expect, it } from 'vitest'
import { applyFilters, filtersToParams, parseFilters } from './filters'
import type { Country } from './types'

const make = (iso3: string, continent: string, blocs: string[]): Country => ({
  iso3, name_en: iso3, region: 'R', income: 'I', capital: null, lat: null, lon: null, continent, blocs,
})

const all = [
  make('BRA', 'Americas', ['Mercosur', 'BRICS']),
  make('ARG', 'Americas', ['Mercosur']),
  make('DEU', 'Europe', ['European Union']),
]

describe('filters', () => {
  it('returns everything when no filter is set', () => {
    expect(applyFilters(all, parseFilters(new URLSearchParams()))).toHaveLength(3)
  })
  it('filters by bloc', () => {
    const f = parseFilters(new URLSearchParams('bloco=Mercosur'))
    expect(applyFilters(all, f).map((c) => c.iso3)).toEqual(['BRA', 'ARG'])
  })
  it('keeps selected countries even outside the bloc', () => {
    const f = parseFilters(new URLSearchParams('bloco=BRICS&paises=DEU'))
    expect(applyFilters(all, f).map((c) => c.iso3)).toEqual(['BRA', 'DEU'])
  })
  it('round-trips through the URL', () => {
    const f = parseFilters(new URLSearchParams('paises=BRA,ARG&continente=Americas'))
    expect(parseFilters(filtersToParams(f))).toEqual(f)
  })
})