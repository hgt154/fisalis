import { parse } from 'yaml'
import type { Bilingual, Lang } from './types'

// ---------------------------------------------------------------------------
// Shapes

export interface Author {
  name: string
  years?: string          // "1901–1986", "1941–"
}

export interface Concept {
  name: string
  description?: string
}

export interface RelatedTheory {
  slug: string
  note?: string           // why it's related ("Amplia a divisão centro-periferia...")
}

export interface Heading {
  id: string              // anchor for the table of contents
  text: string
}

export interface Theory {
  slug: string            // from the file name: realismo.md -> "realismo"
  title: string
  subjects: string[]
  summary: string
  period: string          // free text for the article: "Décadas de 1950 a 1970"
  origin: string          // "CEPAL, Santiago do Chile"
  start: number | null    // first year (negative = B.C.); drives sorting and the period filter
  end: number | null      // last formative year; null = still open ("1979 –")
  yearsLabel: string      // shown in the list: "1795 – 1977", or a custom label
  authors: Author[]
  key_concepts: Concept[]
  related: RelatedTheory[]
  references: string[]
  body: string            // the Markdown text after the frontmatter
  headings: Heading[]     // the "## " titles of the body
  minutes: number         // reading time
  fallback?: boolean      // true when the English version is missing and the Portuguese one is shown
}

// Subject codes used in the files -> labels shown on the page
export const SUBJECTS: Record<string, Bilingual> = {
  politica: { pt: 'Política', en: 'Politics' },
  economica: { pt: 'Econômica', en: 'Economics' },
  seguranca: { pt: 'Segurança', en: 'Security' },
  filosofica: { pt: 'Filosófica', en: 'Philosophy' },
  sociologica: { pt: 'Sociológica', en: 'Sociology' },
}

export const subjectLabel = (code: string, lang: Lang) => SUBJECTS[code]?.[lang] ?? code

// Periods of the filter, by the year a theory first appeared
export const PERIODS: { value: string; label: Bilingual; from: number; to: number }[] = [
  { value: 'classico', label: { pt: 'Clássico (até 1945)', en: 'Classical (to 1945)' }, from: -Infinity, to: 1944 },
  { value: 'guerra-fria', label: { pt: 'Guerra Fria (1945–1989)', en: 'Cold War (1945–1989)' }, from: 1945, to: 1989 },
  { value: 'pos-guerra-fria', label: { pt: 'Pós-Guerra Fria (1990–)', en: 'Post-Cold War (1990–)' }, from: 1990, to: Infinity },
]

// ---------------------------------------------------------------------------
// Small helpers

// "Argumento central" -> "argumento-central" (accents removed)
export function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Every "## Title" line of the Markdown body, for the table of contents
export function headingsOf(body: string): Heading[] {
  return [...body.matchAll(/^## +(.+)$/gm)].map((m) => ({ id: slugify(m[1]), text: m[1].trim() }))
}

// About 200 words per minute, at least 1
export function readingMinutes(body: string): number {
  return Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200))
}

const yearText = (y: number) => (y < 0 ? `${-y} a.C.` : String(y))

// The file may list plain names or objects; both become the same shape
type Loose<T> = string | T
const asAuthor = (a: Loose<{ name: string; years?: string | number }>): Author =>
  typeof a === 'string' ? { name: a } : { name: a.name, years: a.years === undefined ? undefined : String(a.years) }
const asConcept = (c: Loose<Concept>): Concept => (typeof c === 'string' ? { name: c } : c)
const asRelated = (r: Loose<RelatedTheory>): RelatedTheory => (typeof r === 'string' ? { slug: r } : r)

interface Frontmatter {
  title?: string
  subjects?: string[]
  summary?: string
  period?: string
  origin?: string
  years?: (number | null)[]   // [1795, 1977] or [1979]
  years_label?: string        // overrides the label: "Séc. V a.C. – 1948"
  authors?: Loose<{ name: string; years?: string | number }>[]
  key_concepts?: Loose<Concept>[]
  related?: Loose<RelatedTheory>[]
  references?: string[]
}

// ---------------------------------------------------------------------------
// Parsing

// Split "---\n<yaml>\n---\n<markdown>" into data + body
export function parseTheory(path: string, raw: string): Theory {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) throw new Error(`Missing frontmatter in ${path}`)
  const data = (parse(match[1]) ?? {}) as Frontmatter
  const slug = path.split('/').pop()!.replace(/\.md$/, '')
  const body = match[2].trim()

  const start = data.years?.[0] ?? null
  const end = data.years?.[1] ?? null
  const yearsLabel = data.years_label
    ?? (start === null ? '' : end === null ? `${yearText(start)} –` : `${yearText(start)} – ${yearText(end)}`)

  return {
    slug,
    title: data.title ?? slug,
    subjects: data.subjects ?? [],
    summary: data.summary ?? '',
    period: data.period ?? '',
    origin: data.origin ?? '',
    start,
    end,
    yearsLabel,
    authors: (data.authors ?? []).map(asAuthor),
    key_concepts: (data.key_concepts ?? []).map(asConcept),
    related: (data.related ?? []).map(asRelated),
    references: data.references ?? [],
    body,
    headings: headingsOf(body),
    minutes: readingMinutes(body),
  }
}

// ---------------------------------------------------------------------------
// Filtering

export interface TheoryFilters {
  subjects: string[]      // any of these (empty = all)
  period: string | null   // one of PERIODS
  query: string           // words to find in title, summary, authors and concepts
}

export function periodOf(t: Theory): string | null {
  if (t.start === null) return null
  return PERIODS.find((p) => t.start! >= p.from && t.start! <= p.to)?.value ?? null
}

// Everything except the subjects: used for the counts next to each checkbox
function matchesOthers(t: Theory, filters: TheoryFilters): boolean {
  if (filters.period && periodOf(t) !== filters.period) return false
  const words = filters.query.toLowerCase().split(/\s+/).filter(Boolean)
  const text = [t.title, t.summary, ...t.authors.map((a) => a.name), ...t.key_concepts.map((c) => c.name)].join(' ').toLowerCase()
  return words.every((w) => text.includes(w))
}

export function filterTheories(list: Theory[], filters: TheoryFilters): Theory[] {
  return list.filter((t) =>
    (filters.subjects.length === 0 || t.subjects.some((s) => filters.subjects.includes(s))) && matchesOthers(t, filters))
}

// How many theories each subject would show, given the period and the search
export function countBySubject(list: Theory[], filters: TheoryFilters): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(Object.keys(SUBJECTS).map((s) => [s, 0]))
  for (const t of list) if (matchesOthers(t, filters)) for (const s of t.subjects) counts[s] = (counts[s] ?? 0) + 1
  return counts
}

// Oldest first; theories without years go last, in alphabetical order
export function byPeriod(a: Theory, b: Theory): number {
  return (a.start ?? Infinity) - (b.start ?? Infinity) || a.title.localeCompare(b.title, 'pt-BR')
}

// ---------------------------------------------------------------------------
// Every .md file in src/content/theories is bundled into the site at build time.
// Portuguese files are the originals; English ones live in content/theories/en/ with the same file name.

const raw = (files: Record<string, unknown>) => Object.entries(files as Record<string, string>)
const ptFiles = import.meta.glob('../content/theories/*.md', { query: '?raw', import: 'default', eager: true })
const enFiles = import.meta.glob('../content/theories/en/*.md', { query: '?raw', import: 'default', eager: true })

const PT = raw(ptFiles).map(([path, text]) => parseTheory(path, text)).sort(byPeriod)
const EN_BY_SLUG = new Map(raw(enFiles).map(([path, text]) => {
  const t = parseTheory(path, text)
  return [t.slug, t] as const
}))

// English list: the translation when it exists, otherwise the Portuguese entry marked as a fallback
const EN = PT.map((t) => EN_BY_SLUG.get(t.slug) ?? { ...t, fallback: true }).sort(byPeriod)

export const theoriesFor = (lang: Lang): Theory[] => (lang === 'en' ? EN : PT)
