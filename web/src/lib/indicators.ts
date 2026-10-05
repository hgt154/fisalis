import type { GeoFilters } from './filters'
import type { Aggregate, Bilingual, IndicatorGroup, IndicatorMeta, Lang } from './types'

// The three ways the catalog groups indicators, plus "all": every indicator once, A to Z
export type View = IndicatorGroup['view'] | 'all'

export const VIEWS: { value: View; label: Bilingual }[] = [
  { value: 'overview', label: { pt: 'Visão geral', en: 'Overview' } },
  { value: 'theme', label: { pt: 'Por tema', en: 'By theme' } },
  { value: 'sdg', label: { pt: 'Por ODS', en: 'By SDG' } },
  { value: 'all', label: { pt: 'Todos (A–Z)', en: 'All (A–Z)' } },
]

export interface Section {
  group: string
  items: IndicatorMeta[]
}

const OVERVIEW_ORDER = ['Social', 'Economic', 'Environment', 'Institutions']

// Position of a group on the page: fixed order for the overview,
// numeric for SDGs (1, 2, ... 17 instead of 1, 10, 11 ...), alphabetical for themes.
function groupRank(view: View, group: string): number {
  if (view === 'overview') {
    const index = OVERVIEW_ORDER.indexOf(group)
    return index === -1 ? 99 : index
  }
  if (view === 'sdg') return Number(group.match(/\d+/)?.[0] ?? 99)
  return 0
}

// Name of an indicator in the reader's language
const nameIn = (item: IndicatorMeta, lang: Lang) => (lang === 'pt' ? item.name_pt : item.name_en)

// "Água potável..." -> "A"; names that start with a number or symbol go under "#"
export function initial(name: string): string {
  const first = fold(name.trim()).charAt(0).toUpperCase()
  return /[A-Z]/.test(first) ? first : '#'
}

// The "all" tab: every indicator once, alphabetical in the reader's language, one section per letter
function alphabeticalSections(indicators: IndicatorMeta[], lang: Lang): Section[] {
  const sorted = [...indicators].sort((a, b) => nameIn(a, lang).localeCompare(nameIn(b, lang), lang))
  const byLetter = new Map<string, IndicatorMeta[]>()
  for (const item of sorted) {
    const letter = initial(nameIn(item, lang))
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), item])
  }
  return [...byLetter.entries()]
    .map(([group, items]) => ({ group, items }))
    .sort((a, b) => (a.group === '#' ? -1 : b.group === '#' ? 1 : a.group.localeCompare(b.group)))
}

// indicators.json -> the sections of one tab, each with its indicators in order
export function buildSections(indicators: IndicatorMeta[], view: View, lang: Lang = 'pt'): Section[] {
  if (view === 'all') return alphabeticalSections(indicators, lang)

  const byGroup = new Map<string, { item: IndicatorMeta; order: number }[]>()

  for (const item of indicators) {
    for (const g of item.groups) {
      if (g.view !== view) continue
      const list = byGroup.get(g.group) ?? []
      list.push({ item, order: g.order })
      byGroup.set(g.group, list)
    }
  }

  return [...byGroup.entries()]
    .map(([group, list]) => ({ group, items: list.sort((a, b) => a.order - b.order).map((x) => x.item) }))
    .sort((a, b) => groupRank(view, a.group) - groupRank(view, b.group) || a.group.localeCompare(b.group))
}

// The aggregate that matches the filters, if one exists:
//   region / income group -> World Bank aggregate by name (region "Latin America & Caribbean" -> LCN)
//   bloc                  -> official (EU -> EUU) or calculated by the pipeline (BRICS -> BLOC-BRICS)
//   continent             -> calculated by the pipeline (Africa -> CONT-AFRICA)
export function aggregateFor(filters: GeoFilters, aggregates: Aggregate[]): Aggregate | null {
  const name = filters.region ?? filters.income
  if (name) return aggregates.find((a) => a.name_en === name) ?? null
  if (filters.bloc) return aggregates.find((a) => a.bloc === filters.bloc) ?? null
  if (filters.continent) return aggregates.find((a) => a.continent === filters.continent) ?? null
  return null
}

// The group filter that decides the aggregate (same priority as aggregateFor)
export type GroupKind = 'region' | 'income' | 'bloc' | 'continent'
export function activeGroup(filters: GeoFilters): { kind: GroupKind; value: string } | null {
  if (filters.region) return { kind: 'region', value: filters.region }
  if (filters.income) return { kind: 'income', value: filters.income }
  if (filters.bloc) return { kind: 'bloc', value: filters.bloc }
  if (filters.continent) return { kind: 'continent', value: filters.continent }
  return null
}

// Which countries to show next to the aggregate:
// - countries chosen by the reader  -> those (up to max)
// - none chosen, but a group filter -> none: the group's aggregate stands on its own
// - nothing at all                  -> the default country, so the page is never empty on arrival
export function countriesToShow(filters: GeoFilters, defaultIso: string, max: number): string[] {
  if (filters.countries.length) return filters.countries.slice(0, max)
  return activeGroup(filters) ? [] : [defaultIso]
}

// ---------------------------------------------------------------------------
// Portuguese labels for the groups (the catalog stores them in English)

const OVERVIEW_PT: Record<string, string> = {
  Social: 'Social',
  Economic: 'Econômico',
  Environment: 'Ambiente',
  Institutions: 'Instituições',
}

const THEME_PT: Record<string, string> = {
  'Agriculture': 'Agricultura',
  'Climate Change': 'Mudança climática',
  'Digital Development': 'Desenvolvimento digital',
  'Education': 'Educação',
  'Energy': 'Energia',
  'Environment & Natural Resources': 'Meio ambiente e recursos naturais',
  'Finance, Competitiveness & Innovation': 'Finanças, competitividade e inovação',
  'Fragility, Conflict and Violence': 'Fragilidade, conflito e violência',
  'Gender': 'Gênero',
  'Governance': 'Governança',
  'Health, Nutrition & Population': 'Saúde, nutrição e população',
  'Infrastructure and Public-Private Partnerships': 'Infraestrutura e parcerias público-privadas',
  'Jobs & Development': 'Emprego e desenvolvimento',
  'Macroeconomics, Trade & Investment': 'Macroeconomia, comércio e investimento',
  'Poverty & Inequality': 'Pobreza e desigualdade',
  'Social Protection': 'Proteção social',
  'Transport': 'Transporte',
  'Urban, Disaster Risk, Resilience, and Land': 'Urbanização, riscos e resiliência',
  'Water': 'Água',
}

// The 17 SDGs: official short names (Portuguese, English) and the UN colors, in order
const SDGS: [string, string, string][] = [
  ['Erradicação da pobreza', 'No poverty', '#e5243b'],
  ['Fome zero e agricultura sustentável', 'Zero hunger', '#dda63a'],
  ['Saúde e bem-estar', 'Good health and well-being', '#4c9f38'],
  ['Educação de qualidade', 'Quality education', '#c5192d'],
  ['Igualdade de gênero', 'Gender equality', '#ff3a21'],
  ['Água potável e saneamento', 'Clean water and sanitation', '#26bde2'],
  ['Energia limpa e acessível', 'Affordable and clean energy', '#fcc30b'],
  ['Trabalho decente e crescimento econômico', 'Decent work and economic growth', '#a21942'],
  ['Indústria, inovação e infraestrutura', 'Industry, innovation and infrastructure', '#fd6925'],
  ['Redução das desigualdades', 'Reduced inequalities', '#dd1367'],
  ['Cidades e comunidades sustentáveis', 'Sustainable cities and communities', '#fd9d24'],
  ['Consumo e produção responsáveis', 'Responsible consumption and production', '#bf8b2e'],
  ['Ação contra a mudança global do clima', 'Climate action', '#3f7e44'],
  ['Vida na água', 'Life below water', '#0a97d9'],
  ['Vida terrestre', 'Life on land', '#56c02b'],
  ['Paz, justiça e instituições eficazes', 'Peace, justice and strong institutions', '#00689d'],
  ['Parcerias e meios de implementação', 'Partnerships for the goals', '#19486a'],
]

export interface GroupLabel {
  label: string          // "Econômico", "Erradicação da pobreza"
  kicker: string | null  // "ODS 1" / "SDG 1" (SDGs only)
  color: string | null   // SDG color (SDGs only)
}

// "SDG 1 - No Poverty" -> { label: 'Erradicação da pobreza', kicker: 'ODS 1', color: '#e5243b' }
// In English the catalog's own names are used (they are already English).
export function groupLabel(view: View, group: string, lang: Lang = 'pt'): GroupLabel {
  if (view === 'all') return { label: group, kicker: null, color: null }   // a letter
  if (view === 'sdg') {
    const n = Number(group.match(/\d+/)?.[0])
    const sdg = SDGS[n - 1]
    if (sdg) return { label: lang === 'pt' ? sdg[0] : sdg[1], kicker: `${lang === 'pt' ? 'ODS' : 'SDG'} ${n}`, color: sdg[2] }
  }
  if (lang === 'en') return { label: group, kicker: null, color: null }
  const labels = view === 'overview' ? OVERVIEW_PT : THEME_PT
  return { label: labels[group] ?? group, kicker: null, color: null }
}

// Anchor id for a section: "Health, Nutrition & Population" -> "g-health-nutrition-population"
export function groupId(group: string): string {
  const slug = group.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')
  return `g-${slug.replace(/^-|-$/g, '')}`
}

// ---------------------------------------------------------------------------
// Search

// Lowercase without accents, so "educacao" finds "Educação" and "co2" finds "CO2"
export const fold = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Everything a search looks at for one indicator: its names, its code and the names of the
// groups it belongs to, in both languages (so "educação" also finds "Taxa de alfabetização",
// which sits in the Education theme and in SDG 4)
export function searchText(i: IndicatorMeta): string {
  const groups = i.groups.flatMap((g) => [g.group, groupLabel(g.view, g.group, 'pt').label, groupLabel(g.view, g.group, 'en').label])
  return fold([i.name_pt, i.name_en, i.code, ...groups].join(' '))
}

// Keep only indicators whose search text contains every word of the search.
// Sections left empty are dropped.
export function searchSections(sections: Section[], query: string): Section[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return sections
  return sections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => {
        const text = searchText(i)
        return words.every((w) => text.includes(w))
      }),
    }))
    .filter((s) => s.items.length > 0)
}

// Number of different indicators in a list of sections (one indicator can sit in two themes)
export const countIndicators = (sections: Section[]) => new Set(sections.flatMap((s) => s.items.map((i) => i.code))).size
