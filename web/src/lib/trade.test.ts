import { describe, expect, it } from 'vitest'
import { resample, rowsFor, type PartnerRow } from './trade'

const points = [
  { date: '2025-11', value: 1 },
  { date: '2025-12', value: 2 },
  { date: '2026-01', value: 10 },
  { date: '2026-02', value: 20 },
]

describe('resample', () => {
  it('keeps monthly data as is', () => {
    expect(resample(points, 'monthly')).toEqual(points)
  })
  it('sums months into years', () => {
    expect(resample(points, 'annual')).toEqual([{ date: '2025', value: 3 }, { date: '2026', value: 30 }])
  })
  it('accumulates within each year and restarts in January', () => {
    expect(resample(points, 'ytd').map((p) => p.value)).toEqual([1, 3, 10, 30])
  })
})

const row = (country: string, flow: 'export' | 'import', value: number, prev: number): PartnerRow => ({
  country, flow, value, prev, period: 'month', share: 0, var_abs: 0, var_pct: null, iso3: country, continent: null,
})

describe('rowsFor', () => {
  const rows = [row('CHN', 'export', 60, 50), row('USA', 'export', 40, 40), row('CHN', 'import', 30, 20), row('USA', 'import', 70, 70)]

  it('filters one flow and sorts largest first', () => {
    expect(rowsFor(rows, 'month', 'export', (r) => r.country).map((r) => r.country)).toEqual(['CHN', 'USA'])
  })
  it('adds exports and imports for "corrente" and recalculates shares', () => {
    const result = rowsFor(rows, 'month', 'corrente', (r) => r.country)
    expect(result.map((r) => [r.country, r.value, r.share])).toEqual([['USA', 110, 0.55], ['CHN', 90, 0.45]])
    expect(result.find((r) => r.country === 'CHN')?.var_pct).toBeCloseTo(90 / 70 - 1)
  })
})