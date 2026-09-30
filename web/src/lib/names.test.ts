import { describe, expect, it } from 'vitest'
import { aggregateName, countryName, placeName } from './names'

describe('names', () => {
  it('translates places to Portuguese and keeps English as is', () => {
    expect(placeName('region', 'Latin America & Caribbean', 'pt')).toBe('América Latina e Caribe')
    expect(placeName('region', 'Latin America & Caribbean', 'en')).toBe('Latin America & Caribbean')
    expect(placeName('bloc', 'BRICS', 'pt')).toBe('BRICS')   // no translation: original
  })
  it('names aggregates from regions or income groups', () => {
    expect(aggregateName('World', 'pt')).toBe('Mundo')
    expect(aggregateName('Upper middle income', 'pt')).toBe('Renda média-alta')
  })
  it('falls back to the English country name', () => {
    expect(countryName({ name_en: 'Brazil', name_pt: 'Brasil' }, 'pt')).toBe('Brasil')
    expect(countryName({ name_en: 'Kosovo', name_pt: null }, 'pt')).toBe('Kosovo')
    expect(countryName({ name_en: 'Brazil', name_pt: 'Brasil' }, 'en')).toBe('Brazil')
  })
})
