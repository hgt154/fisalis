// Income groups exactly as the World Bank writes them, with a label and a color token
export const INCOME_LEVELS = [
  { value: 'High income', label: 'Alta renda', color: 'var(--income-high)' },
  { value: 'Upper middle income', label: 'Renda média-alta', color: 'var(--income-upper-middle)' },
  { value: 'Lower middle income', label: 'Renda média-baixa', color: 'var(--income-lower-middle)' },
  { value: 'Low income', label: 'Baixa renda', color: 'var(--income-low)' },
]

export const NO_DATA_COLOR = 'var(--map-no-data)'

export function incomeColor(income: string | null | undefined): string {
  return INCOME_LEVELS.find((level) => level.value === income)?.color ?? NO_DATA_COLOR
}

// Sequential colors for "color the map by indicator" (light = low, dark = high).
// Colorblind-safe blues; move them to tokens.css when the design arrives.
export const SEQUENTIAL = ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c']