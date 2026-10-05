import { describe, expect, it } from 'vitest'
import { activeGroup, aggregateFor, buildSections, countriesToShow, countIndicators, groupId, groupLabel, initial, searchSections } from './indicators'
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

describe('countriesToShow', () => {
  const base = { countries: [], bloc: null, continent: null, region: null, income: null }
  it('falls back to the default country only when nothing is selected', () => {
    expect(countriesToShow(base, 'BRA', 4)).toEqual(['BRA'])
  })
  it('shows no country when a group is chosen on its own', () => {
    expect(countriesToShow({ ...base, bloc: 'BRICS' }, 'BRA', 4)).toEqual([])
    expect(countriesToShow({ ...base, income: 'High income' }, 'BRA', 4)).toEqual([])
  })
  it('keeps the chosen countries, up to the maximum', () => {
    expect(countriesToShow({ ...base, bloc: 'BRICS', countries: ['ARG'] }, 'BRA', 4)).toEqual(['ARG'])
    expect(countriesToShow({ ...base, countries: ['A', 'B', 'C', 'D', 'E'] }, 'BRA', 4)).toEqual(['A', 'B', 'C', 'D'])
  })
})

describe('activeGroup', () => {
  const base = { countries: [], bloc: null, continent: null, region: null, income: null }
  it('follows the same priority as aggregateFor', () => {
    expect(activeGroup(base)).toBeNull()
    expect(activeGroup({ ...base, bloc: 'BRICS', continent: 'Africa' })).toEqual({ kind: 'bloc', value: 'BRICS' })
    expect(activeGroup({ ...base, region: 'South Asia', bloc: 'BRICS' })).toEqual({ kind: 'region', value: 'South Asia' })
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

describe('the "all" tab', () => {
  const list = [
    { ...make('X1', [{ view: 'theme', group: 'Education', order: 1 }]), name_pt: 'Taxa de alfabetização', name_en: 'Literacy rate' },
    { ...make('X2', [{ view: 'overview', group: 'Economic', order: 1 }]), name_pt: 'Água potável', name_en: 'Drinking water' },
    { ...make('X3', [{ view: 'sdg', group: 'SDG 4 - Quality Education', order: 1 }]), name_pt: 'Alunos por professor', name_en: 'Pupil-teacher ratio' },
  ]
  it('lists every indicator once, by letter, in the reader\'s language', () => {
    expect(buildSections(list, 'all', 'pt').map((s) => [s.group, s.items.map((i) => i.code)])).toEqual([
      ['A', ['X2', 'X3']], ['T', ['X1']],
    ])
    expect(buildSections(list, 'all', 'en').map((s) => s.group)).toEqual(['D', 'L', 'P'])
  })
  it('puts names that do not start with a letter under #', () => {
    expect(initial('2030 target')).toBe('#')
    expect(initial('Índice')).toBe('I')
  })
  it('search also matches the names of the groups, in both languages', () => {
    const all = buildSections(list, 'all', 'pt')
    expect(countIndicators(searchSections(all, 'educação'))).toBe(2)   // Education theme + SDG 4
    expect(countIndicators(searchSections(all, 'economic'))).toBe(1)
    expect(countIndicators(searchSections(all, 'agua'))).toBe(1)
  })
  it('labels a letter section with the letter itself', () => {
    expect(groupLabel('all', 'A', 'en')).toEqual({ label: 'A', kicker: null, color: null })
  })
})
