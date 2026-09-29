import { describe, expect, it } from 'vitest'
import { aggregateFor, buildSections, groupId, groupLabel } from './indicators'
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
  const aggregates = [{ iso3: 'LCN', name_en: 'Latin America & Caribbean' }]
  const base = { countries: [], bloc: null, continent: null, region: null, income: null }
  it('finds the aggregate for a region', () => {
    expect(aggregateFor({ ...base, region: 'Latin America & Caribbean' }, aggregates)?.iso3).toBe('LCN')
  })
  it('returns null without a region or income filter', () => {
    expect(aggregateFor(base, aggregates)).toBeNull()
  })
})

describe('groupLabel', () => {
  it('translates SDGs and adds the number and color', () => {
    expect(groupLabel('sdg', 'SDG 13 - Climate Action')).toEqual({
      label: 'Ação contra a mudança global do clima', kicker: 'ODS 13', color: '#3f7e44',
    })
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
