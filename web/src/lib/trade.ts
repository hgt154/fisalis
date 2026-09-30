// Types and calculations for the trade page (data from web/public/data/trade/)
import { monthName } from './format'
import { CONTINENT_PT } from './names'
import type { Bilingual, Lang } from './types'

export type Flow = 'export' | 'import'
export type FlowOrTotal = Flow | 'corrente'
export type PeriodKey = 'month' | 'ytd' | 'year'

export interface TradePeriod {
  period: PeriodKey
  label: string
  year: number
  m_from: number
  m_to: number
}

export interface TradeMeta {
  latest: string
  periods: TradePeriod[]
}

export interface SummaryRow {
  period: PeriodKey
  flow: 'export' | 'import' | 'corrente' | 'saldo'
  value: number
  prev: number
  var_pct: number | null
  label: string
}

export interface SeriesTotalRow {
  date: string // "2026-08"
  export: number
  import: number
}

export interface SeriesIsicRow {
  date: string
  flow: Flow
  section: string
  value: number
}

export interface BreakdownRow {
  flow: Flow
  period: PeriodKey
  value: number
  prev: number
  share: number
  var_abs: number
  var_pct: number | null
}

export interface PartnerRow extends BreakdownRow {
  country: string
  iso3: string | null
  continent: string | null
}

export interface StateRow extends BreakdownRow {
  state: string
  uf: string | null
}

export interface ProductRow extends BreakdownRow {
  product_code: string
  product: string
  section_code: string
  section: string
}

export interface ProductSeries {
  flow: Flow
  product_code: string
  product: string
  dates: string[]
  fob: number[]
  kg: number[]
}

export const FLOW_LABELS: Record<FlowOrTotal, Bilingual> = {
  export: { pt: 'Exportação', en: 'Exports' },
  import: { pt: 'Importação', en: 'Imports' },
  corrente: { pt: 'Corrente', en: 'Total trade' },
}

// A period's name in the current language, built from its months (not from the Portuguese
// label in the data): "Agosto 2026" / "August 2026", "Jan–Ago 2026" / "Jan–Aug 2026", "2025".
// yearsBack = 1 gives the comparison period one year earlier.
export function periodLabel(p: Pick<TradePeriod, 'year' | 'm_from' | 'm_to'>, yearsBack = 0): string {
  const year = p.year - yearsBack
  if (p.m_from === p.m_to) return `${monthName(p.m_to)} ${year}`
  if (p.m_from === 1 && p.m_to === 12) return String(year)
  return `${monthName(p.m_from, 'short')}–${monthName(p.m_to, 'short')} ${year}`
}

// ---------------------------------------------------------------------------
// Time series

export type Frequency = 'monthly' | 'annual' | 'ytd'

export interface Point {
  date: string // "2026-08" (monthly) or "2026" (annual)
  value: number
}

export interface Line {
  name: string
  color: string
  points: Point[]
}

// Monthly points -> monthly, annual totals, or running total within each year
export function resample(points: Point[], freq: Frequency): Point[] {
  if (freq === 'monthly') return points

  if (freq === 'annual') {
    const byYear = new Map<string, number>()
    for (const p of points) {
      const year = p.date.slice(0, 4)
      byYear.set(year, (byYear.get(year) ?? 0) + p.value)
    }
    return [...byYear].map(([date, value]) => ({ date, value }))
  }

  let year = ''
  let total = 0
  return points.map((p) => {
    if (p.date.slice(0, 4) !== year) {
      year = p.date.slice(0, 4)
      total = 0
    }
    total += p.value
    return { date: p.date, value: total }
  })
}

// ---------------------------------------------------------------------------
// Breakdowns (partners, states, products)

// Rows of one period and flow, largest first. For "corrente" (exports + imports)
// the two flows are added up per item and shares/changes are recalculated.
export function rowsFor<T extends BreakdownRow>(
  rows: T[],
  period: PeriodKey,
  flow: FlowOrTotal,
  key: (row: T) => string,
): T[] {
  const inPeriod = rows.filter((r) => r.period === period)
  const byValue = (a: T, b: T) => b.value - a.value

  if (flow !== 'corrente') return inPeriod.filter((r) => r.flow === flow).sort(byValue)

  const merged = new Map<string, T>()
  for (const r of inPeriod) {
    const k = key(r)
    const m = merged.get(k)
    merged.set(k, m ? { ...m, value: m.value + r.value, prev: m.prev + r.prev } : { ...r })
  }
  const list = [...merged.values()]
  const total = list.reduce((sum, r) => sum + r.value, 0)
  return list
    .map((r) => ({
      ...r,
      share: total ? r.value / total : 0,
      var_abs: r.value - r.prev,
      var_pct: r.prev > 0 ? r.value / r.prev - 1 : null,
    }))
    .sort(byValue)
}

// ---------------------------------------------------------------------------
// Colors

const CONTINENT_COLORS: Record<string, string> = {
  Africa: 'var(--continent-africa)',
  Americas: 'var(--continent-americas)',
  Asia: 'var(--continent-asia)',
  Europe: 'var(--continent-europe)',
  Oceania: 'var(--continent-oceania)',
}


export const continentColor = (continent: string | null) =>
  (continent && CONTINENT_COLORS[continent]) || 'var(--continent-other)'

export const continentLabel = (continent: string | null, lang: Lang = 'pt') =>
  continent && CONTINENT_COLORS[continent]
    ? (lang === 'pt' ? CONTINENT_PT[continent] ?? continent : continent)
    : (lang === 'pt' ? 'Outros / não declarado' : 'Other / not declared')

// ISIC sections: A = agriculture, B = mining, C = manufacturing, anything else = other
export const sectorColor = (code: string) =>
  ({ A: 'var(--sector-agro)', B: 'var(--sector-extractive)', C: 'var(--sector-manufacturing)' })[code] ??
  'var(--sector-other)'

// Text color inside a colored box: dark on the light colors, white on the dark ones
const LIGHT_COLORS = new Set([
  'var(--continent-africa)', 'var(--continent-americas)', 'var(--continent-oceania)', 'var(--continent-other)',
  'var(--sector-agro)', 'var(--sector-extractive)', 'var(--sector-other)',
])
export const inkOn = (color: string) => (LIGHT_COLORS.has(color) ? '#201f1d' : '#fff')

// Share of each continent in a list of partner rows, largest first (for the legend)
export function continentShares(rows: PartnerRow[]): { continent: string | null; share: number }[] {
  const byContinent = new Map<string | null, number>()
  for (const r of rows) byContinent.set(r.continent, (byContinent.get(r.continent) ?? 0) + r.share)
  return [...byContinent].map(([continent, share]) => ({ continent, share })).sort((a, b) => b.share - a.share)
}
