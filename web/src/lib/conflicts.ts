// Conflicts page: types and calculations for web/public/data/conflicts/ (UCDP)
import { formatList } from './format'

export type ConflictType = 'extrasystemic' | 'interstate' | 'intrastate' | 'internationalized'
export type Violence = 'sb' | 'ns' | 'os'          // state-based, non-state, one-sided
export type Role = 'location' | 'party' | 'supporter'

export const CONFLICT_TYPES: ConflictType[] = ['intrastate', 'internationalized', 'interstate', 'extrasystemic']
export const VIOLENCE_KINDS: Violence[] = ['sb', 'ns', 'os']

export const typeColor = (t: string) => `var(--cf-${t})`
export const violenceColor = (v: string) => `var(--cf-${v})`

export interface ConflictSummary {
  source: string
  version: string        // "261"
  year: number           // latest full year (2025)
  first_year: number     // 1946
  active: number
  wars: number
  by_type: ({ year: number; wars: number } & Record<ConflictType, number>)[]
  deaths: { year: number; sb: number; sb_low: number; sb_high: number; ns: number; os: number }[]
}

export interface Conflict {
  conflict_id: number
  location: string
  side_a: string
  side_b: string
  incompat: 'territory' | 'government' | 'both' | null
  territory: string | null
  type: ConflictType
  start: string | null
  first_year: number
  last_year: number
  years: number[]
  intensity: number[]                 // 1 = 25-999 battle deaths, 2 = 1,000+ (war), per year
  deaths: (number | null)[]           // battle deaths per year (null before 1989)
  deaths_total: number | null
  wars: number                        // years at war intensity
  active: boolean
  countries: { iso3: string; role: Role }[]
}

export interface ConflictMap {
  year: number
  countries: { iso3: string; sb: number; ns: number; os: number; conflicts: number; max_intensity: number }[]
}

export interface Candidate {
  files: string[]
  from: string
  to: string
  months: ({ month: string; events: number } & Record<Violence, number>)[]
  countries: ({ iso3: string; events: number; total: number } & Record<Violence, number>)[]
  conflicts: { conflict_new_id: number; conflict_name: string; kind: Violence; deaths: number; events: number }[]
}

export interface CountryConflicts {
  iso3: string
  conflicts: { conflict_id: number; role: Role }[]
  deaths: ({ year: number; sb_low: number; sb_high: number } & Record<Violence, number>)[]
}

// ---------------------------------------------------------------------------

// Deaths and intensity in the conflict's latest year
export const latestDeaths = (c: Conflict) => c.deaths.at(-1) ?? null
export const latestIntensity = (c: Conflict) => c.intensity.at(-1) ?? 1

// Conflicts active in the latest year, deadliest first
export function activeConflicts(conflicts: Conflict[]): Conflict[] {
  return conflicts
    .filter((c) => c.active)
    .sort((a, b) => (latestDeaths(b) ?? 0) - (latestDeaths(a) ?? 0))
}

// [1946, 1947, 1948, 1955, 1960, 1961] -> "1946–1948, 1955, 1960–1961"
export function yearRanges(years: number[]): string {
  const sorted = [...years].sort((a, b) => a - b)
  const parts: string[] = []
  let start = sorted[0]
  for (let i = 1; i <= sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      const end = sorted[i - 1]
      parts.push(start === end ? String(start) : `${start}–${end}`)
      start = sorted[i]
    }
  }
  return parts.join(', ')
}

// Case- and accent-insensitive text, for searching
export const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export interface ConflictFilter {
  query: string
  type: ConflictType | ''
  activeOnly: boolean
}

// Search by place, parties, disputed territory or the name of any country involved
export function searchConflicts(conflicts: Conflict[], f: ConflictFilter, nameOf: (iso3: string) => string): Conflict[] {
  const words = fold(f.query).split(/\s+/).filter(Boolean)
  return conflicts.filter((c) => {
    if (f.type && c.type !== f.type) return false
    if (f.activeOnly && !c.active) return false
    if (words.length === 0) return true
    const text = fold([c.location, c.side_a, c.side_b, c.territory ?? '', ...c.countries.map((x) => nameOf(x.iso3))].join(' '))
    return words.every((w) => text.includes(w))
  })
}

// Sorting for the history list: most recent first, then the deadliest
export const byRecent = (a: Conflict, b: Conflict) =>
  b.last_year - a.last_year || (b.deaths_total ?? 0) - (a.deaths_total ?? 0) || b.first_year - a.first_year

// Where the conflict happens, in the reader's language when we know the countries ("Rússia e Ucrânia");
// otherwise UCDP's own place name
export function conflictPlace(c: Conflict, nameOf: (iso3: string) => string): string {
  const places = c.countries.filter((x) => x.role === 'location').map((x) => nameOf(x.iso3))
  return places.length ? formatList([...new Set(places)]) : c.location
}

// Files written before the pipeline fix stored one-year conflicts as plain values (2025, not [2025]).
// This turns every per-year field back into a list, so either shape works.
export function normalizeConflicts(raw: Conflict[]): Conflict[] {
  const list = <T,>(x: T | T[] | null | undefined): T[] => (Array.isArray(x) ? x : x === undefined || x === null ? [] : [x])
  return raw.map((c) => ({
    ...c,
    years: list(c.years),
    intensity: list(c.intensity),
    deaths: Array.isArray(c.deaths) ? c.deaths : [c.deaths ?? null],
    countries: list(c.countries),
  }))
}
