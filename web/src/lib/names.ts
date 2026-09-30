// Names of places and groups in the site's two languages.
// The data files use the World Bank's English names; these maps give the Portuguese ones.
import type { Country, IndicatorMeta, Lang } from './types'

export const REGION_PT: Record<string, string> = {
  'East Asia & Pacific': 'Leste Asiático e Pacífico',
  'Europe & Central Asia': 'Europa e Ásia Central',
  'Latin America & Caribbean': 'América Latina e Caribe',
  'Middle East & North Africa': 'Oriente Médio e Norte da África',
  'Middle East, North Africa, Afghanistan & Pakistan': 'Oriente Médio, Norte da África, Afeganistão e Paquistão',
  'North America': 'América do Norte',
  'South Asia': 'Sul da Ásia',
  'Sub-Saharan Africa': 'África Subsaariana',
  'World': 'Mundo',
  'Other': 'Outros',
}

export const CONTINENT_PT: Record<string, string> = {
  Africa: 'África',
  Americas: 'Américas',
  Asia: 'Ásia',
  Europe: 'Europa',
  Oceania: 'Oceania',
  Other: 'Outros',
}

export const INCOME_PT: Record<string, string> = {
  'High income': 'Alta renda',
  'Upper middle income': 'Renda média-alta',
  'Lower middle income': 'Renda média-baixa',
  'Low income': 'Baixa renda',
}

export const BLOC_PT: Record<string, string> = {
  'African Union': 'União Africana',
  'European Union': 'União Europeia',
  Mercosur: 'Mercosul',
  NATO: 'OTAN',
  USMCA: 'T-MEC (USMCA)',
}

type Kind = 'region' | 'continent' | 'income' | 'bloc'
const MAPS: Record<Kind, Record<string, string>> = { region: REGION_PT, continent: CONTINENT_PT, income: INCOME_PT, bloc: BLOC_PT }

// placeName('region', 'Latin America & Caribbean', 'pt') -> "América Latina e Caribe"
// In English, or when there is no translation, the original name is kept.
export function placeName(kind: Kind, value: string, lang: Lang): string {
  return lang === 'pt' ? MAPS[kind][value] ?? value : value
}

// World Bank aggregates are regions or income groups ("World", "Upper middle income"...)
export function aggregateName(name: string, lang: Lang): string {
  return lang === 'pt' ? REGION_PT[name] ?? INCOME_PT[name] ?? name : name
}

// Country name in the chosen language (English if the Portuguese one is missing)
export function countryName(country: Pick<Country, 'name_en' | 'name_pt'>, lang: Lang): string {
  return lang === 'pt' ? country.name_pt || country.name_en : country.name_en
}

export function indicatorName(indicator: Pick<IndicatorMeta, 'name_pt' | 'name_en'>, lang: Lang): string {
  return lang === 'pt' ? indicator.name_pt : indicator.name_en || indicator.name_pt
}
