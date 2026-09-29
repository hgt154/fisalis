import { useState } from 'react'
import { useSearchParams } from 'react-router'
import type { Country } from '../lib/types'
import { FILTER_KEYS, filtersToParams, options, parseFilters, type GeoFilters } from '../lib/filters'
import './GeoFilter.css'

type GroupKey = 'bloc' | 'continent' | 'region' | 'income'

interface Props {
  countries: Country[]
  colors?: string[]   // optional dot color for each selected country, in order
}

export default function GeoFilter({ countries, colors = [] }: Props) {
  const [params, setParams] = useSearchParams()
  const filters = parseFilters(params)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)   // phones: the dropdowns hide behind a "Filtros" button

  // Rebuild the URL from the filters, keeping any other parameters (like the map's ?sel=BRA)
  const withOtherParams = (next: URLSearchParams) => {
    for (const [key, value] of params) if (!FILTER_KEYS.includes(key)) next.set(key, value)
    return next
  }

  const update = (changes: Partial<GeoFilters>) =>
    setParams(withOtherParams(filtersToParams({ ...filters, ...changes })))

  const addCountry = (name: string) => {
    const match = countries.find((c) => c.name_en.toLowerCase() === name.toLowerCase())
    if (match && !filters.countries.includes(match.iso3)) {
      update({ countries: [...filters.countries, match.iso3] })
      setSearch('')
    }
  }

  const removeCountry = (iso: string) => update({ countries: filters.countries.filter((x) => x !== iso) })

  const groups: [string, GroupKey, string[]][] = [
    ['Bloco', 'bloc', options(countries, (c) => c.blocs)],
    ['Continente', 'continent', options(countries, (c) => c.continent)],
    ['Região BM', 'region', options(countries, (c) => c.region)],
    ['Grupo de renda', 'income', options(countries, (c) => c.income)],
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
            {countries.find((c) => c.iso3 === iso)?.name_en ?? iso}
            <button type="button" aria-label={`Remover ${iso}`} onClick={() => removeCountry(iso)}>×</button>
          </span>
        ))}

        <input
          list="country-list"
          value={search}
          aria-label="Buscar país"
          placeholder={filters.countries.length ? 'Adicionar país para comparar…' : 'Buscar país…'}
          onChange={(e) => { setSearch(e.target.value); addCountry(e.target.value) }}
          onKeyDown={(e) => {
            // Backspace in an empty box removes the last chip
            if (e.key === 'Backspace' && !search && filters.countries.length) removeCountry(filters.countries.at(-1)!)
          }}
        />
        <datalist id="country-list">
          {countries.map((c) => <option key={c.iso3} value={c.name_en} />)}
        </datalist>
      </div>

      <button type="button" className="btn btn-secondary geo-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Filtros{activeGroups > 0 && ` (${activeGroups})`}
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
            {values.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        ))}

        {hasAny && (
          <button type="button" className="btn btn-ghost" onClick={() => setParams(withOtherParams(new URLSearchParams()))}>
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  )
}
