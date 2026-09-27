// one function formats every number on the site according to the format column of your indicators.csv

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