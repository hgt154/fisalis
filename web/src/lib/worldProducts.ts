// World tab, products section: types and calculations for web/public/data/trade_products/ (CEPII BACI)
import type { Lang } from './types'

export type ProductFlow = 'export' | 'import'

export interface ProductsIndex {
  source: string
  version: string            // BACI release, e.g. "202601"
  year: number               // latest year in the release (2024)
  first_year: number         // 1995
  groups: { group: string; name_en: string; name_pt: string }[]
  chapters: { chapter: string; group: string; name_en: string; name_pt: string }[]
  economies: { iso3: string; exports: number; hhi: number | null }[]
}

// One year of one flow, with one column per group: { year: 2024, flow: 'export', agri: 1.2e9, minerals: … }
export interface GroupRow {
  year: number
  flow: ProductFlow
  [group: string]: number | string
}

export interface ProductsFile {
  iso3: string
  year: number
  chapters: { flow: ProductFlow; chapter: string; value: number; prev: number }[]
  groups: GroupRow[]
  concentration: { year: number; hhi: number }[]
}

// ---------------------------------------------------------------------------
// Colors: one per broad group (tokens in styles/tokens.css), with readable text on top

const GROUP_COLORS: Record<string, { color: string; ink: string }> = {
  agri:      { color: 'var(--hs-agri)', ink: '#201f1d' },
  minerals:  { color: 'var(--hs-minerals)', ink: '#201f1d' },
  chemicals: { color: 'var(--hs-chemicals)', ink: '#fff' },
  materials: { color: 'var(--hs-materials)', ink: '#201f1d' },
  textiles:  { color: 'var(--hs-textiles)', ink: '#201f1d' },
  metals:    { color: 'var(--hs-metals)', ink: '#fff' },
  machinery: { color: 'var(--hs-machinery)', ink: '#fff' },
  vehicles:  { color: 'var(--hs-vehicles)', ink: '#fff' },
  other:     { color: 'var(--hs-other)', ink: '#201f1d' },
}
export const groupColor = (group: string) => GROUP_COLORS[group]?.color ?? 'var(--hs-other)'
export const groupInk = (group: string) => GROUP_COLORS[group]?.ink ?? '#201f1d'

// ---------------------------------------------------------------------------
// Treemaps: one row per chapter, with its group, share and change vs. the year before

export interface ChapterRow {
  chapter: string
  name: string
  group: string
  value: number
  share: number
  var_pct: number | null
}

export function chapterRows(file: ProductsFile, index: ProductsIndex, flow: ProductFlow, lang: Lang): ChapterRow[] {
  const meta = new Map(index.chapters.map((c) => [c.chapter, c]))
  const rows = file.chapters.filter((c) => c.flow === flow)
  const total = rows.reduce((sum, r) => sum + r.value, 0)
  return rows
    .map((r) => {
      const m = meta.get(r.chapter)
      return {
        chapter: r.chapter,
        name: m ? (lang === 'pt' ? m.name_pt : m.name_en) : r.chapter,
        group: m?.group ?? 'other',
        value: r.value,
        share: total ? r.value / total : 0,
        var_pct: r.prev > 0 ? r.value / r.prev - 1 : null,
      }
    })
    .sort((a, b) => b.value - a.value)
}

// Share of each group in a list of chapter rows, in the index's group order (for the legend)
export function groupShares(rows: ChapterRow[], index: ProductsIndex): { group: string; share: number }[] {
  const byGroup = new Map<string, number>()
  for (const r of rows) byGroup.set(r.group, (byGroup.get(r.group) ?? 0) + r.share)
  return index.groups.map((g) => ({ group: g.group, share: byGroup.get(g.group) ?? 0 }))
}

// ---------------------------------------------------------------------------
// "How the basket changed": each group's share of the total, every year

export interface BasketYear {
  year: number
  shares: Record<string, number>   // group -> 0..1, adding up to 1
  total: number
}

export function basketShares(file: ProductsFile, groups: string[], flow: ProductFlow): BasketYear[] {
  return file.groups
    .filter((r) => r.flow === flow)
    .map((r) => {
      const valueOf = (g: string) => Number(r[g] ?? 0)
      const total = groups.reduce((sum, g) => sum + valueOf(g), 0)
      const shares = Object.fromEntries(groups.map((g) => [g, total ? valueOf(g) / total : 0]))
      return { year: r.year, shares, total }
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => a.year - b.year)
}

// ---------------------------------------------------------------------------
// Export concentration (Herfindahl index over HS 4-digit headings)

export type ConcentrationLevel = 'diversified' | 'moderate' | 'concentrated' | 'high'

// Arco's bands, stated on the page: < 0.05 | 0.05–0.15 | 0.15–0.40 | ≥ 0.40
export function concentrationLevel(hhi: number): ConcentrationLevel {
  if (hhi < 0.05) return 'diversified'
  if (hhi < 0.15) return 'moderate'
  if (hhi < 0.4) return 'concentrated'
  return 'high'
}

// Position from the most concentrated (1) among the countries (the World is left out)
export function concentrationRank(index: ProductsIndex, iso3: string): { position: number; total: number } | null {
  const ranked = index.economies
    .filter((e) => e.iso3 !== 'WLD' && e.hhi !== null)
    .sort((a, b) => (b.hhi as number) - (a.hhi as number))
  const position = ranked.findIndex((e) => e.iso3 === iso3)
  return position < 0 ? null : { position: position + 1, total: ranked.length }
}
