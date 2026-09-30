import type { Bilingual } from './types'

// Income groups exactly as the World Bank writes them, with labels and a color token
export const INCOME_LEVELS: { value: string; label: Bilingual; short: Bilingual; color: string }[] = [
  { value: 'High income', label: { pt: 'Alta renda', en: 'High income' }, short: { pt: 'alta', en: 'high' }, color: 'var(--income-high)' },
  { value: 'Upper middle income', label: { pt: 'Renda média-alta', en: 'Upper middle income' }, short: { pt: 'média-alta', en: 'upper middle' }, color: 'var(--income-upper-middle)' },
  { value: 'Lower middle income', label: { pt: 'Renda média-baixa', en: 'Lower middle income' }, short: { pt: 'média-baixa', en: 'lower middle' }, color: 'var(--income-lower-middle)' },
  { value: 'Low income', label: { pt: 'Baixa renda', en: 'Low income' }, short: { pt: 'baixa', en: 'low' }, color: 'var(--income-low)' },
]

export const NO_DATA_COLOR = 'var(--map-no-data)'

export function incomeColor(income: string | null | undefined): string {
  return INCOME_LEVELS.find((level) => level.value === income)?.color ?? NO_DATA_COLOR
}

// Sequential scale for "color by indicator" (amber = low, forest green = high).
// The colors live in tokens.css, so the dark theme can swap them.
export const SEQUENTIAL = ['var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)', 'var(--seq-5)', 'var(--seq-6)']
