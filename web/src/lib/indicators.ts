// This holds the tab and section logic, kept apart from the visual components so it can be tested.

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