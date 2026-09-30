import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { useLang } from '../i18n/context'
import { countryName, placeName } from '../lib/names'
import type { Country } from '../lib/types'
import { FILTER_KEYS, filtersToParams, options, parseFilters, type GeoFilters } from '../lib/filters'
import './GeoFilter.css'

type GroupKey = 'bloc' | 'continent' | 'region' | 'income'

interface Props {
  countries: Country[]
  colors?: string[]    // optional dot color for each selected country, in order
  summary?: ReactNode  // optional text at the right end (e.g. "217 economias")
}

export default function GeoFilter({ countries, colors = [], summary }: Props) {
  const [params, setParams] = useSearchParams()
  const filters = parseFilters(params)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)   // phones: the dropdowns hide behind a "Filtros" button
  const { t, lang } = useLang()
  const nameOf = (c: Country) => countryName(c, lang)

  // Rebuild the URL from the filters, keeping any other parameters (like the map's ?sel=BRA)
  const withOtherParams = (next: URLSearchParams) => {
    for (const [key, value] of params) if (!FILTER_KEYS.includes(key)) next.set(key, value)
    return next
  }

  const update = (changes: Partial<GeoFilters>) =>
    setParams(withOtherParams(filtersToParams({ ...filters, ...changes })))

  const addCountry = (name: string) => {
    const match = countries.find((c) => nameOf(c).toLowerCase() === name.toLowerCase())
    if (match && !filters.countries.includes(match.iso3)) {
      update({ countries: [...filters.countries, match.iso3] })
      setSearch('')
    }
  }

  const removeCountry = (iso: string) => update({ countries: filters.countries.filter((x) => x !== iso) })

  // [label, filter key, values in the data] — the values stay in English (they go in the URL);
  // only what the visitor sees is translated
  const groups: [string, GroupKey, string[]][] = [
    [t.geo.bloc, 'bloc', options(countries, (c) => c.blocs)],
    [t.geo.continent, 'continent', options(countries, (c) => c.continent)],
    [t.geo.region, 'region', options(countries, (c) => c.region)],
    [t.geo.income, 'income', options(countries, (c) => c.income)],
  ]
  const activeGroups = groups.filter(([, key]) => filters[key]).length
  const hasAny = activeGroups > 0 || filters.countries.length > 0

  return (
    <div className="geo-filter">
      <div className="geo-search">
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.5" />
        </svg>

        {filters.countries.map((iso, i) => (
          <span key={iso} className="chip">
            {colors[i] && <span className="chip-dot" style={{ background: colors[i] }} />}
            {(() => { const c = countries.find((x) => x.iso3 === iso); return c ? nameOf(c) : iso })()}
            <button type="button" aria-label={t.geo.remove(iso)} onClick={() => removeCountry(iso)}>×</button>
          </span>
        ))}

        <input
          list="country-list"
          value={search}
          aria-label={t.geo.searchLabel}
          placeholder={filters.countries.length ? t.geo.addPlaceholder : t.geo.searchPlaceholder}
          onChange={(e) => { setSearch(e.target.value); addCountry(e.target.value) }}
          onKeyDown={(e) => {
            // Backspace in an empty box removes the last chip
            if (e.key === 'Backspace' && !search && filters.countries.length) removeCountry(filters.countries.at(-1)!)
          }}
        />
        <datalist id="country-list">
          {countries.map((c) => <option key={c.iso3} value={nameOf(c)} />)}
        </datalist>
      </div>

      <button type="button" className="btn btn-secondary geo-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {t.common.filters}{activeGroups > 0 && ` (${activeGroups})`}
      </button>

      <div className={`geo-selects${open ? ' open' : ''}`}>
        {groups.map(([label, key, values]) => (
          <select
            key={key}
            aria-label={label}
            className={filters[key] ? 'is-set' : undefined}
            value={filters[key] ?? ''}
            onChange={(e) => update({ [key]: e.target.value || null })}
          >
            <option value="">{label}</option>
            {values.map((v) => <option key={v} value={v}>{placeName(key, v, lang)}</option>)}
          </select>
        ))}

        {hasAny && (
          <button type="button" className="btn btn-ghost" onClick={() => setParams(withOtherParams(new URLSearchParams()))}>
            {t.common.clearFilters}
          </button>
        )}
      </div>

      {summary && <span className="geo-summary muted">{summary}</span>}
    </div>
  )
}
