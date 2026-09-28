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



const short = new Intl.NumberFormat(LOCALE, { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 })

// Short numbers for chart axes: 33 bi, 500 mi, 2,5 mil
export function formatShort(value: number): string {
  return short.format(value)
}

// Year-over-year change with an arrow: ↑ 12,2%  /  ↓ 3,4%
export function formatChange(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return '—'
  const arrow = ratio > 0 ? '↑' : ratio < 0 ? '↓' : '='
  return `${arrow} ${decimal1.format(Math.abs(ratio * 100))}%`
}