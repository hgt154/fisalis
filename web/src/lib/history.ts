import { parse } from 'yaml'
import { headingsOf, readingMinutes, type Heading } from './theories'
import { fold } from './indicators'
import type { Bilingual, Lang } from './types'

// ---------------------------------------------------------------------------
// Shapes
//
// Each country has a roster (content/history/<ISO3>.yaml) with every head of state since 1945,
// and, for those already written, an article (content/history/<lang>/<ISO3>/<slug>.md).

export type Access = 'elected' | 'indirect' | 'succession' | 'interim' | 'coup' | 'military'
export type Regime = 'democracy' | 'restricted' | 'military' | 'authoritarian' | 'transition'

export const REGIMES: Regime[] = ['democracy', 'restricted', 'authoritarian', 'military', 'transition']
export const regimeColor = (r: Regime) => `var(--hist-${r})`

export interface Era {
  from: number
  to: number | null      // null = still going
  name: Bilingual
}

export interface KeyDate {
  date: string           // "1953-10-03" or "1954-02" (month only, when the day is uncertain)
  text: string
}

export interface KeyTerm {
  name: string
  description?: string
}

export interface Article {
  lang: Lang             // the language the text is written in
  summary: string
  keyDates: KeyDate[]
  keyTerms: KeyTerm[]
  references: string[]
  body: string
  headings: Heading[]
  minutes: number
}

export interface Ruler {
  iso3: string
  slug: string           // "vargas-1951": name + first year, unique within the country
  name: string
  party: string | null
  start: string          // "1951-01-31"
  end: string | null     // null = in office
  access: Access
  regime: Regime
  note: string | null    // one-paragraph description, used while there is no article
  article: Article | null
}

export interface CountryHistory {
  iso3: string
  eras: Era[]
  rulers: Ruler[]        // oldest first
}

// The countries of the page; the ones marked "soon" show as "coming soon"
export const HISTORY_COUNTRIES: { iso3: string; soon?: boolean }[] = [
  { iso3: 'BRA' },
  { iso3: 'ARG' },
  { iso3: 'USA' },
  { iso3: 'CHN', soon: true },
  { iso3: 'RUS', soon: true },
]

// ---------------------------------------------------------------------------
// Dates and periods

const DAY = 86_400_000
const toTime = (date: string) => Date.parse(date.length === 7 ? `${date}-01` : date)
const endTime = (r: Pick<Ruler, 'end'>, today: Date) => (r.end ? toTime(r.end) : today.getTime())

// "1951 – 1954", "1955" (same year), "2023 –" (in office)
export function yearsLabel(r: Pick<Ruler, 'start' | 'end'>): string {
  const a = r.start.slice(0, 4)
  if (!r.end) return `${a} –`
  const b = r.end.slice(0, 4)
  return a === b ? a : `${a} – ${b}`
}

// How long they stayed: { days } under two months, { months } under two years, otherwise { years }
export function duration(r: Pick<Ruler, 'start' | 'end'>, today = new Date()): { unit: 'days' | 'months' | 'years'; n: number } {
  const days = Math.max(1, Math.round((endTime(r, today) - toTime(r.start)) / DAY))
  if (days < 60) return { unit: 'days', n: days }
  if (days < 730) return { unit: 'months', n: Math.round(days / 30.44) }
  return { unit: 'years', n: Math.round((days / 365.25) * 10) / 10 }
}

// Calendar years in which they were in office for at least half the year: the years whose
// annual data (GDP growth, inflation...) can fairly be attributed to them
export function termYears(r: Pick<Ruler, 'start' | 'end'>, today = new Date()): number[] {
  const from = toTime(r.start)
  const to = endTime(r, today)
  const years: number[] = []
  for (let y = new Date(from).getUTCFullYear(); y <= new Date(to).getUTCFullYear(); y++) {
    const yearStart = Date.UTC(y, 0, 1)
    const yearEnd = Date.UTC(y + 1, 0, 1)
    const overlap = Math.min(to, yearEnd) - Math.max(from, yearStart)
    if (overlap >= (yearEnd - yearStart) / 2) years.push(y)
  }
  return years
}

// Every calendar year they were in office at all (for conflicts, which are counted per year)
export function yearsTouched(r: Pick<Ruler, 'start' | 'end'>, today = new Date()): number[] {
  const a = Number(r.start.slice(0, 4))
  const b = r.end ? Number(r.end.slice(0, 4)) : today.getFullYear()
  return Array.from({ length: b - a + 1 }, (_, i) => a + i)
}

// The era a government belongs to: the one it started in
// (eras run from "from" up to, but not including, "to"; a government starting in the last year
// of an era with no next era yet, like 1945 in Brazil, stays in that era)
export function eraOf(r: Pick<Ruler, 'start'>, eras: Era[]): Era | null {
  const y = Number(r.start.slice(0, 4))
  return eras.find((e) => e.from <= y && (e.to === null || y < e.to))
    ?? eras.find((e) => e.to === y)
    ?? null
}

// Average of the values in the given years, the year range that had data, and the highest value
export function termStat(points: [number, number][] | undefined, years: number[]) {
  const inTerm = (points ?? []).filter(([y]) => years.includes(y))
  if (inTerm.length === 0) return null
  const values = inTerm.map(([, v]) => v)
  const peak = inTerm.reduce((best, p) => (p[1] > best[1] ? p : best))
  return {
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    first: inTerm[0],
    last: inTerm[inTerm.length - 1],
    peak,
    years: inTerm.length,
  }
}

// ---------------------------------------------------------------------------
// Search and filters

export interface HistoryFilters {
  era: number | null     // the era's first year
  query: string
}

export function filterRulers(rulers: Ruler[], eras: Era[], filters: HistoryFilters): Ruler[] {
  const words = fold(filters.query).split(/\s+/).filter(Boolean)
  return rulers.filter((r) => {
    if (filters.era !== null && eraOf(r, eras)?.from !== filters.era) return false
    const text = fold([r.name, r.party ?? '', r.note ?? '', r.article?.summary ?? '', r.start.slice(0, 4),
      ...(r.article?.keyTerms.map((k) => k.name) ?? [])].join(' '))
    return words.every((w) => text.includes(w))
  })
}

// ---------------------------------------------------------------------------
// Parsing

interface RosterFile {
  eras?: Era[]
  rulers?: {
    slug: string
    name: string
    party?: string | null
    start: string
    end?: string | null
    access: Access
    regime: Regime
    note?: string | null
  }[]
}

export function parseRoster(iso3: string, text: string): CountryHistory {
  const data = (parse(text) ?? {}) as RosterFile
  const rulers: Ruler[] = (data.rulers ?? []).map((r) => ({
    iso3,
    slug: r.slug,
    name: r.name,
    party: r.party ?? null,
    start: String(r.start),
    end: r.end ? String(r.end) : null,
    access: r.access,
    regime: r.regime,
    note: r.note ?? null,
    article: null,
  }))
  rulers.sort((a, b) => a.start.localeCompare(b.start))
  return { iso3, eras: data.eras ?? [], rulers }
}

interface ArticleFrontmatter {
  summary?: string
  key_dates?: KeyDate[]
  key_terms?: (string | KeyTerm)[]
  references?: string[]
}

export function parseArticle(path: string, raw: string, lang: Lang): Article {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) throw new Error(`Missing frontmatter in ${path}`)
  const data = (parse(match[1]) ?? {}) as ArticleFrontmatter
  const body = match[2].trim()
  return {
    lang,
    summary: data.summary ?? '',
    keyDates: (data.key_dates ?? []).map((d) => ({ date: String(d.date), text: d.text })),
    keyTerms: (data.key_terms ?? []).map((k) => (typeof k === 'string' ? { name: k } : k)),
    references: data.references ?? [],
    body,
    headings: headingsOf(body),
    minutes: readingMinutes(body),
  }
}

// "../content/history/en/BRA/vargas-1951.md" -> { lang: 'en', iso3: 'BRA', slug: 'vargas-1951' }
export function articlePath(path: string): { lang: Lang; iso3: string; slug: string } | null {
  const m = path.match(/history\/(pt|en)\/([A-Z]{3})\/([^/]+)\.md$/)
  return m ? { lang: m[1] as Lang, iso3: m[2], slug: m[3].replace(/\.md$/, '') } : null
}

// Attach to each ruler the article in the reader's language, or in the other one when
// that is all there is (the page then says so)
export function attachArticles(country: CountryHistory, articles: Map<string, Article>, lang: Lang): CountryHistory {
  const other: Lang = lang === 'pt' ? 'en' : 'pt'
  const key = (l: Lang, slug: string) => `${l}/${country.iso3}/${slug}`
  return {
    ...country,
    rulers: country.rulers.map((r) => ({
      ...r,
      article: articles.get(key(lang, r.slug)) ?? articles.get(key(other, r.slug)) ?? null,
    })),
  }
}

// ---------------------------------------------------------------------------
// Every roster and article is bundled into the site at build time

const rosterFiles = import.meta.glob('../content/history/*.yaml', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const articleFiles = import.meta.glob('../content/history/*/*/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const ROSTERS = new Map(Object.entries(rosterFiles).map(([path, text]) => {
  const iso3 = path.match(/([A-Z]{3})\.yaml$/)![1]
  return [iso3, parseRoster(iso3, text)] as const
}))

const ARTICLES = new Map<string, Article>()
for (const [path, text] of Object.entries(articleFiles)) {
  const where = articlePath(path)
  if (where) ARTICLES.set(`${where.lang}/${where.iso3}/${where.slug}`, parseArticle(path, text, where.lang))
}

export function historyOf(iso3: string, lang: Lang): CountryHistory | null {
  const roster = ROSTERS.get(iso3)
  return roster ? attachArticles(roster, ARTICLES, lang) : null
}
