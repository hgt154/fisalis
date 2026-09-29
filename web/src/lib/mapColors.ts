// Income groups exactly as the World Bank writes them, with labels and a color token
export const INCOME_LEVELS = [
  { value: 'High income', label: 'Alta renda', short: 'alta', color: 'var(--income-high)' },
  { value: 'Upper middle income', label: 'Renda média-alta', short: 'média-alta', color: 'var(--income-upper-middle)' },
  { value: 'Lower middle income', label: 'Renda média-baixa', short: 'média-baixa', color: 'var(--income-lower-middle)' },
  { value: 'Low income', label: 'Baixa renda', short: 'baixa', color: 'var(--income-low)' },
]

export const NO_DATA_COLOR = 'var(--map-no-data)'

export function incomeColor(income: string | null | undefined): string {
  return INCOME_LEVELS.find((level) => level.value === income)?.color ?? NO_DATA_COLOR
}

// Sequential scale for "color by indicator" (amber = low, forest green = high).
// The colors live in tokens.css, so the dark theme can swap them.
export const SEQUENTIAL = ['var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)', 'var(--seq-5)', 'var(--seq-6)']
