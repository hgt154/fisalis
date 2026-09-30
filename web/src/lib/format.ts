import type { IndicatorFormat } from './types'

// ---------------------------------------------------------------------------
// Current locale. The language provider sets it (see i18n/LanguageProvider.tsx),
// so every formatter below follows the language the visitor chose.

export type Locale = 'pt-BR' | 'en'
let LOCALE: Locale = 'pt-BR'

export function setLocale(locale: Locale) { LOCALE = locale }
export function getLocale(): Locale { return LOCALE }

const NO_DATA: Record<Locale, string> = { 'pt-BR': 'Sem dados', en: 'No data' }

// Formatters are created once per locale and reused (creating Intl objects is slow)
const cache = new Map<string, Intl.NumberFormat>()
function nf(key: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const id = `${LOCALE}|${key}`
  if (!cache.has(id)) cache.set(id, new Intl.NumberFormat(LOCALE, options))
  return cache.get(id)!
}
const compact = () => nf('compact', { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 2 })
const decimal1 = () => nf('decimal1', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const integer = () => nf('integer', { maximumFractionDigits: 0 })

// Numbers below this are shown in full (US$ 10.713), above it compact (US$ 2,28 trilhões)
const COMPACT_FROM = 1_000_000

export function formatValue(value: number | null | undefined, format: IndicatorFormat): string {
  if (value === null || value === undefined || Number.isNaN(value)) return NO_DATA[LOCALE]

  switch (format) {
    case 'percent':
      return `${decimal1().format(value)}%`
    case 'currency':
      return `US$ ${Math.abs(value) >= COMPACT_FROM ? compact().format(value) : integer().format(value)}`
    case 'compact':
      return Math.abs(value) >= COMPACT_FROM ? compact().format(value) : integer().format(value)
    case 'number':
    default:
      return Math.abs(value) >= 100 ? integer().format(value) : decimal1().format(value)
  }
}

// Short numbers: 33 bi / 33B, 500 mi / 500M (axes, stat bands). `digits` = max decimals
export function formatShort(value: number, digits = 1): string {
  return nf(`short${digits}`, { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: digits }).format(value)
}

// Money in cards and bars: US$ 33,2 bi · −US$ 1,6 bi  (English: US$ 33.2B)
export function formatUsdShort(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value < 0 ? '−' : ''}US$ ${formatShort(Math.abs(value), digits)}`
}

// "2026-09-15" -> "15 set. 2026" / "Sep 15, 2026";  "2026-08" -> "ago. 2026" / "Aug 2026"
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const options: Intl.DateTimeFormatOptions = d
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : { month: 'short', year: 'numeric' }
  return new Date(y, m - 1, d || 1).toLocaleDateString(LOCALE, options).replace(/ de /g, ' ')
}

// Month name: monthName(8) -> "Agosto" / "August";  short: "Ago" / "Aug"
export function monthName(month: number, style: 'long' | 'short' = 'long'): string {
  const name = new Date(2000, month - 1, 1).toLocaleDateString(LOCALE, { month: style }).replace('.', '')
  return name.charAt(0).toUpperCase() + name.slice(1)
}

// ["Brasil", "Argentina", "México"] -> "Brasil, Argentina e México" / "Brazil, Argentina and Mexico"
export function formatList(items: string[]): string {
  return new Intl.ListFormat(LOCALE, { style: 'long', type: 'conjunction' }).format(items)
}

// Year-over-year change with an arrow: ↑ 12,2%  /  ↓ 3,4%
export function formatChange(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return '—'
  const arrow = ratio > 0 ? '↑' : ratio < 0 ? '↓' : '='
  return `${arrow} ${decimal1().format(Math.abs(ratio * 100))}%`
}
