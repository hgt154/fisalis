import { describe, expect, it } from 'vitest'
import { formatDate, formatShort, formatValue } from './format'

describe('formatValue', () => {
  it('formats large currency values compactly', () => {
    expect(formatValue(2.27992e12, 'currency')).toBe('US$ 2,28 trilhões')
  })
  it('formats small currency values in full', () => {
    expect(formatValue(10713.29, 'currency')).toBe('US$ 10.713')
  })
  it('formats percentages with one decimal', () => {
    expect(formatValue(3, 'percent')).toBe('3,0%')
  })
  it('formats population compactly', () => {
    expect(formatValue(212812405, 'compact')).toBe('212,81 milhões')
  })
  it('handles missing values', () => {
    expect(formatValue(null, 'number')).toBe('Sem dados')
  })
})


describe('formatShort and formatDate', () => {
  // Intl puts a non-breaking space (\u00a0) between the number and "bi", so they never split across lines
  it('shortens large numbers', () => {
    expect(formatShort(7.39e9)).toBe('7,4\u00a0bi')
    expect(formatShort(1.1835e14, 2)).toBe('118,35\u00a0tri')
  })
  it('formats full dates and months', () => {
    expect(formatDate('2026-09-15')).toBe('15 set. 2026')
    expect(formatDate('2026-08')).toBe('ago. 2026')
  })
})