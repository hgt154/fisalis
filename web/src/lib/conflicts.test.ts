import { describe, expect, it } from 'vitest'
import { activeConflicts, byRecent, normalizeConflicts, searchConflicts, yearRanges, type Conflict } from './conflicts'

const make = (id: number, over: Partial<Conflict>): Conflict => ({
  conflict_id: id, location: 'X', side_a: 'Government of X', side_b: 'Rebels', incompat: 'government',
  territory: null, type: 'intrastate', start: null, first_year: 2000, last_year: 2000, years: [2000],
  intensity: [1], deaths: [100], deaths_total: 100, wars: 0, active: false, countries: [], ...over,
})

const list = [
  make(1, { location: 'Russia, Ukraine', type: 'interstate', active: true, last_year: 2025, deaths: [500, 94741], deaths_total: 95241,
            countries: [{ iso3: 'RUS', role: 'location' }, { iso3: 'UKR', role: 'location' }] }),
  make(2, { location: 'Sudan', active: true, last_year: 2025, deaths: [12269], territory: null }),
  make(3, { location: 'Vietnam (North Vietnam)', type: 'interstate', first_year: 1965, last_year: 1975, deaths: [null], deaths_total: null,
            countries: [{ iso3: 'VNM', role: 'location' }, { iso3: 'USA', role: 'party' }] }),
]
const names: Record<string, string> = { RUS: 'Rússia', UKR: 'Ucrânia', VNM: 'Vietnã', USA: 'Estados Unidos' }
const nameOf = (iso: string) => names[iso] ?? iso

describe('yearRanges', () => {
  it('joins consecutive years', () => {
    expect(yearRanges([1960, 1946, 1947, 1948, 1955, 1961])).toBe('1946–1948, 1955, 1960–1961')
    expect(yearRanges([2025])).toBe('2025')
  })
})

describe('activeConflicts', () => {
  it('keeps the active ones, deadliest first', () => {
    expect(activeConflicts(list).map((c) => c.conflict_id)).toEqual([1, 2])
  })
})

describe('searchConflicts', () => {
  const none = { query: '', type: '' as const, activeOnly: false }
  it('finds a conflict by the translated name of a country involved, without accents', () => {
    expect(searchConflicts(list, { ...none, query: 'estados unidos' }, nameOf).map((c) => c.conflict_id)).toEqual([3])
    expect(searchConflicts(list, { ...none, query: 'ucrania' }, nameOf).map((c) => c.conflict_id)).toEqual([1])
  })
  it('filters by type and by active', () => {
    expect(searchConflicts(list, { ...none, type: 'interstate' }, nameOf)).toHaveLength(2)
    expect(searchConflicts(list, { ...none, type: 'interstate', activeOnly: true }, nameOf)).toHaveLength(1)
  })
})

describe('byRecent', () => {
  it('puts the most recent first, then the deadliest', () => {
    expect([...list].sort(byRecent).map((c) => c.conflict_id)).toEqual([1, 2, 3])
  })
})

describe('normalizeConflicts', () => {
  it('turns a one-year conflict written as plain values back into lists', () => {
    const raw = { ...make(9, {}), years: 2025, intensity: 1, deaths: 300, countries: { iso3: 'SDN', role: 'location' } } as unknown as Conflict
    const [c] = normalizeConflicts([raw])
    expect(c.years).toEqual([2025])
    expect(c.intensity).toEqual([1])
    expect(c.deaths).toEqual([300])
    expect(c.countries).toEqual([{ iso3: 'SDN', role: 'location' }])
  })
  it('keeps a missing death count as one empty value', () => {
    const raw = { ...make(9, {}), years: 1960, deaths: null } as unknown as Conflict
    expect(normalizeConflicts([raw])[0].deaths).toEqual([null])
  })
})
