import type { IndicatorFormat } from './types'

const LOCALE = 'pt-BR'

const compact = new Intl.NumberFormat(LOCALE, {
  notation: 'compact',
  compactDisplay: 'long',
  maximumFractionDigits: 2,
})

const decimal1 = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })

// Numbers below this are shown in full (US$ 10.713), above it compact (US$ 2,28 trilhões)
const COMPACT_FROM = 1_000_000

export function formatValue(value: number | null | undefined, format: IndicatorFormat): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Sem dados'

  switch (format) {
    case 'percent':
      return `${decimal1.format(value)}%`
    case 'currency':
      return `US$ ${Math.abs(value) >= COMPACT_FROM ? compact.format(value) : integer.format(value)}`
    case 'compact':
      return Math.abs(value) >= COMPACT_FROM ? compact.format(value) : integer.format(value)
    case 'number':
    default:
      return Math.abs(value) >= 100 ? integer.format(value) : decimal1.format(value)
  }
}

// Short numbers: 33 bi, 500 mi, 2,5 mil (axes, stat bands). `digits` = max decimals
export function formatShort(value: number, digits = 1): string {
  return new Intl.NumberFormat(LOCALE, { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: digits }).format(value)
}

// Money in cards and bars: US$ 33,2 bi · −US$ 1,6 bi
export function formatUsdShort(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value < 0 ? '−' : ''}US$ ${formatShort(Math.abs(value), digits)}`
}

// "2026-09-15" -> "15 set. 2026";  "2026-08" -> "ago. 2026"
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const options: Intl.DateTimeFormatOptions = d
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : { month: 'short', year: 'numeric' }
  return new Date(y, m - 1, d || 1).toLocaleDateString(LOCALE, options).replace(/ de /g, ' ')
}

// Year-over-year change with an arrow: ↑ 12,2%  /  ↓ 3,4%
export function formatChange(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return '—'
  const arrow = ratio > 0 ? '↑' : ratio < 0 ? '↓' : '='
  return `${arrow} ${decimal1.format(Math.abs(ratio * 100))}%`
}
