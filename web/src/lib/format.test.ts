import { describe, expect, it } from 'vitest'
import { formatValue } from './format'

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