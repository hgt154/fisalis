import type { GeoFilters } from './filters'
import type { Aggregate, IndicatorGroup, IndicatorMeta } from './types'

export type View = IndicatorGroup['view']

export const VIEWS: { value: View; label: string }[] = [
  { value: 'overview', label: 'Visão geral' },
  { value: 'theme', label: 'Por tema' },
  { value: 'sdg', label: 'Por ODS' },
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

// indicators.json -> the sections of one tab, each with its indicators in order
export function buildSections(indicators: IndicatorMeta[], view: View): Section[] {
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

// A World Bank aggregate matching the region or income filter, if one exists
// (e.g. region "Latin America & Caribbean" -> aggregate LCN)
export function aggregateFor(filters: GeoFilters, aggregates: Aggregate[]): Aggregate | null {
  const name = filters.region ?? filters.income
  return name ? aggregates.find((a) => a.name_en === name) ?? null : null
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

// The 17 SDGs: official short names in Portuguese and the UN colors, in order
const SDGS: [string, string][] = [
  ['Erradicação da pobreza', '#e5243b'],
  ['Fome zero e agricultura sustentável', '#dda63a'],
  ['Saúde e bem-estar', '#4c9f38'],
  ['Educação de qualidade', '#c5192d'],
  ['Igualdade de gênero', '#ff3a21'],
  ['Água potável e saneamento', '#26bde2'],
  ['Energia limpa e acessível', '#fcc30b'],
  ['Trabalho decente e crescimento econômico', '#a21942'],
  ['Indústria, inovação e infraestrutura', '#fd6925'],
  ['Redução das desigualdades', '#dd1367'],
  ['Cidades e comunidades sustentáveis', '#fd9d24'],
  ['Consumo e produção responsáveis', '#bf8b2e'],
  ['Ação contra a mudança global do clima', '#3f7e44'],
  ['Vida na água', '#0a97d9'],
  ['Vida terrestre', '#56c02b'],
  ['Paz, justiça e instituições eficazes', '#00689d'],
  ['Parcerias e meios de implementação', '#19486a'],
]

export interface GroupLabel {
  label: string          // "Econômico", "Erradicação da pobreza"
  kicker: string | null  // "ODS 1" (SDGs only)
  color: string | null   // SDG color (SDGs only)
}

// "SDG 1 - No Poverty" -> { label: 'Erradicação da pobreza', kicker: 'ODS 1', color: '#e5243b' }
export function groupLabel(view: View, group: string): GroupLabel {
  if (view === 'sdg') {
    const n = Number(group.match(/\d+/)?.[0])
    const sdg = SDGS[n - 1]
    if (sdg) return { label: sdg[0], kicker: `ODS ${n}`, color: sdg[1] }
  }
  const labels = view === 'overview' ? OVERVIEW_PT : THEME_PT
  return { label: labels[group] ?? group, kicker: null, color: null }
}

// Anchor id for a section: "Health, Nutrition & Population" -> "g-health-nutrition-population"
export function groupId(group: string): string {
  const slug = group.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')
  return `g-${slug.replace(/^-|-$/g, '')}`
}
