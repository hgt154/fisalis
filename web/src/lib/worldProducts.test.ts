import { describe, expect, it } from 'vitest'
import {
  basketShares, chapterRows, concentrationLevel, concentrationRank, groupShares, type ProductsFile, type ProductsIndex,
} from './worldProducts'

const index: ProductsIndex = {
  source: 'CEPII', version: '202601', year: 2024, first_year: 2023,
  groups: [
    { group: 'agri', name_en: 'Agriculture', name_pt: 'Agropecuária' },
    { group: 'minerals', name_en: 'Minerals', name_pt: 'Minerais' },
    { group: 'other', name_en: 'Other', name_pt: 'Outros' },
  ],
  chapters: [
    { chapter: '12', group: 'agri', name_en: 'Oilseeds', name_pt: 'Oleaginosas' },
    { chapter: '27', group: 'minerals', name_en: 'Fuels', name_pt: 'Combustíveis' },
  ],
  economies: [
    { iso3: 'AAA', exports: 100, hhi: 0.5 },
    { iso3: 'BBB', exports: 100, hhi: 0.02 },
    { iso3: 'CCC', exports: 100, hhi: 0.2 },
    { iso3: 'WLD', exports: 300, hhi: 0.9 },   // the World never enters the ranking
  ],
}

const file: ProductsFile = {
  iso3: 'AAA',
  year: 2024,
  chapters: [
    { flow: 'export', chapter: '12', value: 60, prev: 40 },
    { flow: 'export', chapter: '27', value: 30, prev: 0 },
    { flow: 'export', chapter: '99', value: 10, prev: 10 },   // a chapter outside the list
    { flow: 'import', chapter: '27', value: 50, prev: 50 },
  ],
  groups: [
    { year: 2024, flow: 'export', agri: 60, minerals: 30, other: 10 },
    { year: 2023, flow: 'export', agri: 40, minerals: 0, other: 10 },
    { year: 2024, flow: 'import', agri: 0, minerals: 50, other: 0 },
  ],
  concentration: [{ year: 2024, hhi: 0.5 }],
}

describe('chapterRows', () => {
  it('names chapters in the chosen language, with shares and change', () => {
    const rows = chapterRows(file, index, 'export', 'pt')
    expect(rows.map((r) => r.name)).toEqual(['Oleaginosas', 'Combustíveis', '99'])
    expect(rows[0].share).toBeCloseTo(0.6)
    expect(rows[0].var_pct).toBeCloseTo(0.5)
    expect(rows[1].var_pct).toBeNull()
    expect(rows[2].group).toBe('other')
  })
})

describe('groupShares', () => {
  it('adds chapter shares up by group, in the index order', () => {
    const shares = groupShares(chapterRows(file, index, 'export', 'en'), index)
    expect(shares.map((s) => s.group)).toEqual(['agri', 'minerals', 'other'])
    expect(shares[0].share).toBeCloseTo(0.6)
  })
})

describe('basketShares', () => {
  it('turns yearly values into shares, oldest first', () => {
    const years = basketShares(file, ['agri', 'minerals', 'other'], 'export')
    expect(years.map((y) => y.year)).toEqual([2023, 2024])
    expect(years[0].shares.agri).toBeCloseTo(0.8)
    expect(years[1].shares.minerals).toBeCloseTo(0.3)
  })
})

describe('concentration', () => {
  it('puts an index value in a band', () => {
    expect(concentrationLevel(0.02)).toBe('diversified')
    expect(concentrationLevel(0.05)).toBe('moderate')
    expect(concentrationLevel(0.2)).toBe('concentrated')
    expect(concentrationLevel(0.81)).toBe('high')
  })
  it('ranks countries from the most concentrated, without the World', () => {
    expect(concentrationRank(index, 'AAA')).toEqual({ position: 1, total: 3 })
    expect(concentrationRank(index, 'BBB')).toEqual({ position: 3, total: 3 })
    expect(concentrationRank(index, 'WLD')).toBeNull()
  })
})
