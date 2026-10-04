import { useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router'
import { useLang } from '../../i18n/context'
import { formatShort, getLocale } from '../../lib/format'
import { VIOLENCE_KINDS, byRecent, normalizeConflicts, violenceColor, type Conflict, type CountryConflicts as CountryFile } from '../../lib/conflicts'
import { useJson } from '../../lib/data'
import StackedBars from '../StackedBars'
import ConflictTable from './ConflictTable'
import '../../pages/ConflictsPage.css'

interface Props {
  iso3: string
  nameOf: (iso3: string) => string
}

const int = (n: number) => n.toLocaleString(getLocale(), { maximumFractionDigits: 0 })

// "Conflitos" on a country profile: every conflict it hosted, fought in or supported since 1946,
// and the deaths in organized violence on its territory since 1989
export default function CountryConflicts({ iso3, nameOf }: Props) {
  const { t } = useLang()
  const cf = t.conflicts
  const { hash } = useLocation()

  const all = useJson<Conflict[]>('conflicts/conflicts.json')
  const file = useJson<CountryFile>(`conflicts/countries/${iso3}.json`)   // missing file = no deaths recorded
  const conflicts = useMemo(() => normalizeConflicts(all.data ?? []), [all.data])

  // Coming from the conflicts map (/pais/UKR#conflitos): scroll here once the data is in
  const ready = !all.loading && !file.loading
  useEffect(() => {
    if (ready && hash === '#conflitos') document.getElementById('conflitos')?.scrollIntoView()
  }, [ready, hash])

  if (all.loading || !all.data) return null

  const mine = conflicts.filter((c) => c.countries.some((x) => x.iso3 === iso3)).sort(byRecent)
  const roles = new Map(mine.map((c) => [c.conflict_id, c.countries.find((x) => x.iso3 === iso3)?.role]))
  const deaths = file.data?.deaths ?? []
  const hasDeaths = deaths.some((d) => d.sb + d.ns + d.os > 0)
  const latestYear = Math.max(...conflicts.map((c) => c.last_year))

  return (
    <section id="conflitos" className="trade-section country-conflicts">
      <header className="trade-section-head">
        <div>
          <h2>{cf.country.title}</h2>
          <p className="muted">{cf.country.subtitle(1946)}</p>
        </div>
        <Link className="btn btn-ghost" to="/conflitos">{cf.country.more}</Link>
      </header>

      {mine.length === 0 && !hasDeaths ? (
        <p className="muted">{cf.country.none}</p>
      ) : (
        <>
          {hasDeaths && (
            <div className="country-conflicts-chart">
              <h3 className="conflicts-chart-title">{cf.country.deathsChart}</h3>
              <ul className="trade-legend">
                {VIOLENCE_KINDS.map((k) => (
                  <li key={k}><span className="legend-swatch" style={{ background: violenceColor(k) }} />{cf.kinds[k]}</li>
                ))}
              </ul>
              <StackedBars
                rows={deaths.map((d) => ({ label: String(d.year), values: { sb: d.sb, ns: d.ns, os: d.os } }))}
                keys={[...VIOLENCE_KINDS]}
                colorOf={violenceColor}
                labelOf={(k) => cf.kinds[k as keyof typeof cf.kinds]}
                format={int}
                formatAxis={(v) => formatShort(v, 0)}
                totalLabel={cf.total}
                height={220}
              />
            </div>
          )}
          {mine.length > 0 && (
            <ConflictTable rows={mine} mode="country" year={latestYear} nameOf={nameOf} roleOf={(id) => roles.get(id)} />
          )}
        </>
      )}
    </section>
  )
}
