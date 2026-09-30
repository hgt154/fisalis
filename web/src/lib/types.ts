// Shapes of the JSON files written by the R pipeline (web/public/data/)

// Site languages
export type Lang = 'pt' | 'en'

export interface Country {
  iso3: string
  name_en: string
  name_pt?: string | null   // added by the pipeline (countrycode); older files may not have it
  region: string
  income: string
  capital: string | null
  lat: number | null
  lon: number | null
  continent: string
  blocs: string[]
}

export interface Aggregate {
  iso3: string
  name_en: string
}

export type IndicatorFormat = 'number' | 'percent' | 'currency' | 'compact'

export interface IndicatorGroup {
  view: 'overview' | 'theme' | 'sdg'
  group: string
  order: number
}

// Text in both languages, for labels that live in the code
export type Bilingual = Record<Lang, string>

export interface IndicatorMeta {
  code: string
  name_pt: string
  name_en: string
  unit: string
  format: IndicatorFormat
  higher_is_better: boolean | null
  source_note: string | null
  description: string | null
  groups: IndicatorGroup[]
}

export interface LatestValue {
  iso3: string
  code: string
  year: number
  value: number
}

export interface MapSummary extends Country {
  population: number | null
  gdp: number | null
  gdp_pc: number | null
}

// series/BRA.json -> { "SP.POP.TOTL": [[2000, 175873720], ...], ... }
export type Series = Record<string, [number, number][]>
