import { describe, expect, it } from 'vitest'
import { aggregateFor, buildSections, countIndicators, groupId, groupLabel, searchSections } from './indicators'
import type { IndicatorMeta } from './types'

const make = (code: string, groups: IndicatorMeta['groups']): IndicatorMeta => ({
  code, name_pt: code, name_en: code, unit: '', format: 'number',
  higher_is_better: null, source_note: null, description: null, groups,
})

const indicators = [
  make('A', [{ view: 'sdg', group: 'SDG 10 - Reduced Inequalities', order: 1 }]),
  make('B', [{ view: 'sdg', group: 'SDG 2 - Zero Hunger', order: 2 }, { view: 'overview', group: 'Economic', order: 1 }]),
  make('C', [{ view: 'sdg', group: 'SDG 2 - Zero Hunger', order: 1 }, { view: 'overview', group: 'Social', order: 1 }]),
]

describe('buildSections', () => {
  it('sorts SDGs numerically, not alphabetically', () => {
    expect(buildSections(indicators, 'sdg').map((s) => s.group)).toEqual([
      'SDG 2 - Zero Hunger',
      'SDG 10 - Reduced Inequalities',
    ])
  })
  it('orders indicators inside a group by their order column', () => {
    expect(buildSections(indicators, 'sdg')[0].items.map((i) => i.code)).toEqual(['C', 'B'])
  })
  it('uses the fixed overview order', () => {
    expect(buildSections(indicators, 'overview').map((s) => s.group)).toEqual(['Social', 'Economic'])
  })
})

describe('aggregateFor', () => {
  const aggregates = [
    { iso3: 'LCN', name_en: 'Latin America & Caribbean' },
    { iso3: 'EUU', name_en: 'European Union', kind: 'official' as const, bloc: 'European Union' },
    { iso3: 'BLOC-BRICS', name_en: 'BRICS', kind: 'calculated' as const, bloc: 'BRICS' },
    { iso3: 'CONT-AFRICA', name_en: 'Africa', kind: 'calculated' as const, continent: 'Africa' },
  ]
  const base = { countries: [], bloc: null, continent: null, region: null, income: null }
  it('finds the aggregate for a region', () => {
    expect(aggregateFor({ ...base, region: 'Latin America & Caribbean' }, aggregates)?.iso3).toBe('LCN')
  })
  it('finds official and calculated bloc aggregates, and continents', () => {
    expect(aggregateFor({ ...base, bloc: 'European Union' }, aggregates)?.iso3).toBe('EUU')
    expect(aggregateFor({ ...base, bloc: 'BRICS' }, aggregates)?.iso3).toBe('BLOC-BRICS')
    expect(aggregateFor({ ...base, continent: 'Africa' }, aggregates)?.iso3).toBe('CONT-AFRICA')
  })
  it('returns null when nothing matches', () => {
    expect(aggregateFor(base, aggregates)).toBeNull()
    expect(aggregateFor({ ...base, bloc: 'NATO' }, aggregates)).toBeNull()
  })
})

describe('groupLabel', () => {
  it('translates SDGs and adds the number and color', () => {
    expect(groupLabel('sdg', 'SDG 13 - Climate Action')).toEqual({
      label: 'Ação contra a mudança global do clima', kicker: 'ODS 13', color: '#3f7e44',
    })
  })

  it('uses English names and "SDG" in English', () => {
    expect(groupLabel('sdg', 'SDG 13 - Climate Action', 'en')).toMatchObject({ label: 'Climate action', kicker: 'SDG 13' })
    expect(groupLabel('overview', 'Economic', 'en').label).toBe('Economic')
  })

  it('translates overview groups and falls back to the original name', () => {
    expect(groupLabel('overview', 'Economic').label).toBe('Econômico')
    expect(groupLabel('theme', 'Something New').label).toBe('Something New')
  })
})

describe('groupId', () => {
  it('builds a safe anchor id', () => {
    expect(groupId('Health, Nutrition & Population')).toBe('g-health-nutrition-population')
  })
})

describe('searchSections', () => {
  const sections = [
    { group: 'Social', items: [
      { ...make('SE.ADT.LITR.ZS', []), name_pt: 'Taxa de alfabetização', name_en: 'Literacy rate' },
      { ...make('SP.POP.TOTL', []), name_pt: 'População, total', name_en: 'Population, total' },
    ] },
    { group: 'Economic', items: [{ ...make('NY.GDP.MKTP.CD', []), name_pt: 'PIB (US$ correntes)', name_en: 'GDP (current US$)' }] },
  ]

  it('ignores accents and case, and searches both languages and the code', () => {
    expect(countIndicators(searchSections(sections, 'ALFABETIZACAO'))).toBe(1)
    expect(countIndicators(searchSections(sections, 'gdp'))).toBe(1)
    expect(countIndicators(searchSections(sections, 'sp.pop'))).toBe(1)
  })
  it('needs every word and drops empty sections', () => {
    const result = searchSections(sections, 'população total')
    expect(result.map((s) => s.group)).toEqual(['Social'])
    expect(searchSections(sections, 'população pib')).toEqual([])
  })
  it('returns everything for an empty search', () => {
    expect(searchSections(sections, '  ')).toBe(sections)
  })
})
