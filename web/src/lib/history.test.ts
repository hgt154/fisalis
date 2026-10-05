import { describe, expect, it } from 'vitest'
import {
  articlePath, attachArticles, duration, eraOf, filterRulers, historyOf, parseArticle, parseRoster,
  termStat, termYears, yearsLabel, yearsTouched, type Article,
} from './history'

const roster = parseRoster('BRA', `
eras:
  - { from: 1930, to: 1945, name: { en: "Vargas Era", pt: "Era Vargas" } }
  - { from: 1946, to: 1964, name: { en: "Fourth Republic", pt: "República de 1946" } }
rulers:
  - { slug: dutra-1946, name: Eurico Gaspar Dutra, party: PSD, start: "1946-01-31", end: "1951-01-31", access: elected, regime: democracy, note: "General." }
  - { slug: linhares-1945, name: José Linhares, start: "1945-10-29", end: "1946-01-31", access: interim, regime: transition }
  - { slug: lula-2023, name: Lula, start: "2023-01-01", end: null, access: elected, regime: democracy }
`)

describe('parseRoster', () => {
  it('reads eras and rulers, oldest first', () => {
    expect(roster.eras).toHaveLength(2)
    expect(roster.rulers.map((r) => r.slug)).toEqual(['linhares-1945', 'dutra-1946', 'lula-2023'])
    expect(roster.rulers[0]).toMatchObject({ iso3: 'BRA', party: null, end: '1946-01-31', note: null, article: null })
    expect(roster.rulers[2].end).toBeNull()
  })
})

describe('periods', () => {
  const today = new Date('2026-10-05')
  it('labels the years in office', () => {
    expect(yearsLabel({ start: '1951-01-31', end: '1954-08-24' })).toBe('1951 – 1954')
    expect(yearsLabel({ start: '1955-11-08', end: '1955-11-11' })).toBe('1955')
    expect(yearsLabel({ start: '2023-01-01', end: null })).toBe('2023 –')
  })
  it('measures the time in office in days, months or years', () => {
    expect(duration({ start: '1955-11-08', end: '1955-11-11' })).toEqual({ unit: 'days', n: 3 })
    expect(duration({ start: '1961-01-31', end: '1961-08-25' })).toEqual({ unit: 'months', n: 7 })
    expect(duration({ start: '1951-01-31', end: '1954-08-24' })).toEqual({ unit: 'years', n: 3.6 })
    expect(duration({ start: '2023-01-01', end: null }, today).unit).toBe('years')
  })
  it('attributes a year to whoever held office for at least half of it', () => {
    expect(termYears({ start: '1951-01-31', end: '1954-08-24' })).toEqual([1951, 1952, 1953, 1954])
    expect(termYears({ start: '1954-08-24', end: '1955-11-08' })).toEqual([1955])
    expect(termYears({ start: '1955-11-08', end: '1955-11-11' })).toEqual([])
    expect(termYears({ start: '2023-01-01', end: null }, today)).toEqual([2023, 2024, 2025, 2026])
  })
  it('lists every calendar year touched, for conflicts', () => {
    expect(yearsTouched({ start: '1954-08-24', end: '1955-11-08' })).toEqual([1954, 1955])
  })
  it('places a government in the era it started in', () => {
    expect(eraOf({ start: '1945-10-29' }, roster.eras)?.from).toBe(1930)   // last year of the era
    expect(eraOf({ start: '1951-01-31' }, roster.eras)?.from).toBe(1946)
    expect(eraOf({ start: '1920-01-01' }, roster.eras)).toBeNull()
  })
})

describe('termStat', () => {
  const points: [number, number][] = [[1960, 1], [1961, 10], [1962, 2], [1963, 6]]
  it('averages the years of the term and finds the peak', () => {
    const s = termStat(points, [1961, 1962, 1963])!
    expect(s.mean).toBe(6)
    expect(s.peak).toEqual([1961, 10])
    expect(s.first).toEqual([1961, 10])
    expect(s.last).toEqual([1963, 6])
  })
  it('returns null without data in those years', () => {
    expect(termStat(points, [1950])).toBeNull()
    expect(termStat(undefined, [1961])).toBeNull()
  })
})

describe('articles', () => {
  const raw = `---
summary: A summary.
key_dates:
  - { date: "1953-10-03", text: "Petrobras" }
  - { date: "1954-02", text: "Manifesto" }
key_terms:
  - Petrobras
  - { name: BNDE, description: Development bank }
references:
  - "Fausto, Boris."
---

## History

Text.

## Economy

More text.`
  const article = parseArticle('x.md', raw, 'en')

  it('reads the frontmatter and the sections', () => {
    expect(article.summary).toBe('A summary.')
    expect(article.keyDates[1]).toEqual({ date: '1954-02', text: 'Manifesto' })
    expect(article.keyTerms).toEqual([{ name: 'Petrobras' }, { name: 'BNDE', description: 'Development bank' }])
    expect(article.headings.map((h) => h.text)).toEqual(['History', 'Economy'])
  })
  it('finds language, country and slug in the file path', () => {
    expect(articlePath('../content/history/en/BRA/vargas-1951.md')).toEqual({ lang: 'en', iso3: 'BRA', slug: 'vargas-1951' })
    expect(articlePath('../content/history/BRA.yaml')).toBeNull()
  })
  it('uses the other language when the reader\'s is missing', () => {
    const articles = new Map<string, Article>([['en/BRA/dutra-1946', article]])
    const pt = attachArticles(roster, articles, 'pt')
    expect(pt.rulers.find((r) => r.slug === 'dutra-1946')?.article?.lang).toBe('en')
    expect(pt.rulers.find((r) => r.slug === 'lula-2023')?.article).toBeNull()
  })
})

describe('filterRulers', () => {
  it('filters by era and by words in name, party or note, without accents', () => {
    expect(filterRulers(roster.rulers, roster.eras, { era: 1946, query: '' }).map((r) => r.slug)).toEqual(['dutra-1946'])
    expect(filterRulers(roster.rulers, roster.eras, { era: null, query: 'jose' }).map((r) => r.slug)).toEqual(['linhares-1945'])
    expect(filterRulers(roster.rulers, roster.eras, { era: null, query: 'psd general' })).toHaveLength(1)
  })
})

describe('the real content', () => {
  for (const iso3 of ['BRA', 'ARG', 'USA']) {
    it(`${iso3}: valid roster, no overlaps, unique slugs, articles attached`, () => {
      const h = historyOf(iso3, 'en')!
      expect(h.rulers.length).toBeGreaterThan(10)
      expect(new Set(h.rulers.map((r) => r.slug)).size).toBe(h.rulers.length)
      for (const [a, b] of h.rulers.slice(0, -1).map((r, i) => [r, h.rulers[i + 1]])) {
        expect(a.end, `${a.slug} must have an end`).not.toBeNull()
        expect(a.end! <= b.start, `${a.slug} ends after ${b.slug} starts`).toBe(true)
        expect(a.start < a.end!, `${a.slug} ends before it starts`).toBe(true)
      }
      for (const r of h.rulers) {
        expect(['elected', 'indirect', 'succession', 'interim', 'coup', 'military']).toContain(r.access)
        expect(['democracy', 'restricted', 'military', 'authoritarian', 'transition']).toContain(r.regime)
        expect(r.note || r.article, `${r.slug} needs a note or an article`).toBeTruthy()
        expect(eraOf(r, h.eras), `${r.slug} has no era`).not.toBeNull()
      }
      const written = h.rulers.filter((r) => r.article)
      expect(written.length).toBeGreaterThan(0)
      for (const r of written) expect(r.article!.headings.map((x) => x.text)).toEqual(['History', 'Economy', 'Politics', 'Foreign policy'])
    })
  }
})
