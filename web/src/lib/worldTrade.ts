// World trade tab: types and calculations for web/public/data/trade_world/ (IMF, IMTS).
// The goal is to turn one economy's file into the same shapes the Brazil tab already uses,
// so the summary cards, the historical chart and the partners section can be reused as they are.
import type { PartnerRow, PeriodKey, SeriesTotalRow, SummaryRow, TradePeriod } from './trade'

export const WORLD = 'WLD'

export interface WorldTradeIndex {
  source: string
  updated: string
  economies: { iso3: string; last_month: string | null; last_year: number | null; partners: boolean }[]
  partner_names: { iso3: string; name_en: string; name_pt: string | null; continent?: string | null }[]
}

interface FlowValues {
  export: number | null
  import: number | null
}

export interface WorldTradeFile {
  iso3: string
  monthly: ({ date: string } & FlowValues)[]
  annual: ({ year: number } & FlowValues)[]
  partners: { year: number; flow: 'export' | 'import'; iso3: string; value: number }[]
}

// A row is only usable when both flows are there (otherwise "total" and "balance" would be wrong)
const complete = <T extends FlowValues>(r: T): r is T & { export: number; import: number } =>
  r.export !== null && r.import !== null

// Monthly rows for the chart, in the Brazil tab's shape
export function monthlySeries(file: WorldTradeFile): SeriesTotalRow[] {
  return file.monthly.filter(complete).map(({ date, export: e, import: i }) => ({ date, export: e, import: i }))
}

// Yearly rows for the chart ("2025" as the date, like the chart's own annual totals)
export function annualSeries(file: WorldTradeFile): SeriesTotalRow[] {
  return file.annual.filter(complete).map(({ year, export: e, import: i }) => ({ date: String(year), export: e, import: i }))
}

// ---------------------------------------------------------------------------
// Summary cards

// The periods this economy can offer: latest month and year to date (only with monthly data)
// and the latest full year
export function worldPeriods(file: WorldTradeFile): TradePeriod[] {
  const periods: TradePeriod[] = []
  const last = monthlySeries(file).at(-1)?.date
  if (last) {
    const [year, month] = last.split('-').map(Number)
    periods.push({ period: 'month', label: '', year, m_from: month, m_to: month })
    periods.push({ period: 'ytd', label: '', year, m_from: 1, m_to: month })
  }
  const lastYear = annualSeries(file).at(-1)?.date
  if (lastYear) periods.push({ period: 'year', label: '', year: Number(lastYear), m_from: 1, m_to: 12 })
  return periods
}

// Exports and imports added up over one period; null when a month is missing
function totalsFor(file: WorldTradeFile, p: TradePeriod, yearsBack: number): { export: number; import: number } | null {
  const year = p.year - yearsBack
  if (p.period === 'year') {
    const row = file.annual.find((r) => r.year === year)
    return row && complete(row) ? { export: row.export, import: row.import } : null
  }
  const months = monthlySeries(file).filter((r) => {
    const [y, m] = r.date.split('-').map(Number)
    return y === year && m >= p.m_from && m <= p.m_to
  })
  if (months.length !== p.m_to - p.m_from + 1) return null
  return {
    export: months.reduce((sum, r) => sum + r.export, 0),
    import: months.reduce((sum, r) => sum + r.import, 0),
  }
}

// The four cards (exports, imports, total trade, balance) for every period, vs. one year earlier
export function worldSummary(file: WorldTradeFile, periods: TradePeriod[]): SummaryRow[] {
  return periods.flatMap((p) => {
    const now = totalsFor(file, p, 0)
    if (!now) return []
    const before = totalsFor(file, p, 1)
    const row = (flow: SummaryRow['flow'], value: number, prev: number | null): SummaryRow => ({
      period: p.period,
      flow,
      value,
      prev: prev ?? Number.NaN,
      var_pct: flow !== 'saldo' && prev !== null && prev > 0 ? value / prev - 1 : null,
      label: '',
    })
    return [
      row('export', now.export, before?.export ?? null),
      row('import', now.import, before?.import ?? null),
      row('corrente', now.export + now.import, before ? before.export + before.import : null),
      row('saldo', now.export - now.import, before ? before.export - before.import : null),
    ]
  })
}

// The period to show: the one in the URL if this economy has it, otherwise the first available
export function pickPeriod(wanted: PeriodKey, periods: TradePeriod[]): TradePeriod | undefined {
  return periods.find((p) => p.period === wanted) ?? periods[0]
}

// ---------------------------------------------------------------------------
// Partners

export interface PartnerInfo {
  name: string
  continent: string | null
}

// Partner rows for the latest year with partner data, in the Brazil tab's shape
// (period "year", share of the total, change vs. the year before)
export function worldPartners(file: WorldTradeFile, info: (iso3: string) => PartnerInfo): { year: number | null; rows: PartnerRow[] } {
  if (file.partners.length === 0) return { year: null, rows: [] }
  const year = Math.max(...file.partners.map((p) => p.year))

  const rows = (['export', 'import'] as const).flatMap((flow) => {
    const now = file.partners.filter((p) => p.flow === flow && p.year === year)
    const before = new Map(file.partners.filter((p) => p.flow === flow && p.year === year - 1).map((p) => [p.iso3, p.value]))
    const total = now.reduce((sum, p) => sum + p.value, 0)
    return now.map((p): PartnerRow => {
      const prev = before.get(p.iso3) ?? 0
      const { name, continent } = info(p.iso3)
      return {
        flow,
        period: 'year',
        value: p.value,
        prev,
        share: total ? p.value / total : 0,
        var_abs: p.value - prev,
        var_pct: prev > 0 ? p.value / prev - 1 : null,
        country: name,
        iso3: p.iso3,
        continent,
      }
    })
  })
  return { year, rows }
}
