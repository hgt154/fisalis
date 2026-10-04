import { describe, expect, it } from 'vitest'
import { annualSeries, monthlySeries, pickPeriod, worldPartners, worldPeriods, worldSummary, type WorldTradeFile } from './worldTrade'

// Two months of 2025 and two of 2026, a gap in 2026-03 (import missing), two full years
const file: WorldTradeFile = {
  iso3: 'AAA',
  monthly: [
    { date: '2025-01', export: 10, import: 8 },
    { date: '2025-02', export: 20, import: 10 },
    { date: '2026-01', export: 15, import: 9 },
    { date: '2026-02', export: 30, import: 12 },
    { date: '2026-03', export: 40, import: null },
  ],
  annual: [
    { year: 2024, export: 100, import: 90 },
    { year: 2025, export: 150, import: 120 },
  ],
  partners: [
    { year: 2024, flow: 'export', iso3: 'BBB', value: 40 },
    { year: 2025, flow: 'export', iso3: 'BBB', value: 60 },
    { year: 2025, flow: 'export', iso3: 'CCC', value: 40 },
    { year: 2025, flow: 'import', iso3: 'BBB', value: 50 },
  ],
}

describe('series', () => {
  it('drops months where a flow is missing', () => {
    expect(monthlySeries(file).map((r) => r.date)).toEqual(['2025-01', '2025-02', '2026-01', '2026-02'])
  })
  it('turns years into chart dates', () => {
    expect(annualSeries(file)[1]).toEqual({ date: '2025', export: 150, import: 120 })
  })
})

describe('worldPeriods and worldSummary', () => {
  const periods = worldPeriods(file)

  it('offers the latest complete month, the year to date and the latest year', () => {
    expect(periods.map((p) => [p.period, p.year, p.m_from, p.m_to])).toEqual([
      ['month', 2026, 2, 2],
      ['ytd', 2026, 1, 2],
      ['year', 2025, 1, 12],
    ])
  })

  it('adds up the period and compares with one year earlier', () => {
    const rows = worldSummary(file, periods)
    const ytdExport = rows.find((r) => r.period === 'ytd' && r.flow === 'export')!
    expect(ytdExport.value).toBe(45)
    expect(ytdExport.prev).toBe(30)
    expect(ytdExport.var_pct).toBeCloseTo(0.5)
    const yearBalance = rows.find((r) => r.period === 'year' && r.flow === 'saldo')!
    expect(yearBalance.value).toBe(30)
    expect(yearBalance.prev).toBe(10)
    expect(yearBalance.var_pct).toBeNull()
  })

  it('works for an economy that only has yearly data', () => {
    const yearly = { ...file, monthly: [] }
    const p = worldPeriods(yearly)
    expect(p.map((x) => x.period)).toEqual(['year'])
    expect(pickPeriod('month', p)?.period).toBe('year')
    expect(worldSummary(yearly, p)).toHaveLength(4)
  })
})

describe('worldPartners', () => {
  const info = (iso3: string) => ({ name: `Name ${iso3}`, continent: iso3 === 'BBB' ? 'Asia' : null })

  it('uses the latest year, with shares and change vs. the year before', () => {
    const { year, rows } = worldPartners(file, info)
    expect(year).toBe(2025)
    const bbb = rows.find((r) => r.flow === 'export' && r.iso3 === 'BBB')!
    expect(bbb.share).toBeCloseTo(0.6)
    expect(bbb.var_pct).toBeCloseTo(0.5)
    expect(bbb.country).toBe('Name BBB')
    expect(rows.find((r) => r.iso3 === 'CCC')!.var_pct).toBeNull()
  })

  it('is empty when there is no partner data', () => {
    expect(worldPartners({ ...file, partners: [] }, info)).toEqual({ year: null, rows: [] })
  })
})
