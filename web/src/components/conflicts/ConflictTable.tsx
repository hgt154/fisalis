import { useLang } from '../../i18n/context'
import { getLocale } from '../../lib/format'
import { conflictPlace, latestDeaths, latestIntensity, typeColor, yearRanges, type Conflict, type Role } from '../../lib/conflicts'

type Mode = 'now' | 'history' | 'country'

interface Props {
  rows: Conflict[]
  mode: Mode
  year: number                                  // latest full year (for "Deaths in 2025")
  nameOf: (iso3: string) => string              // country names in the current language
  roleOf?: (conflictId: number) => Role | undefined
}

const int = (n: number) => n.toLocaleString(getLocale(), { maximumFractionDigits: 0 })

// The years a conflict was active: short ranges, or first–last when the list gets long
function activeYears(c: Conflict): string {
  const ranges = yearRanges(c.years)
  return ranges.split(', ').length > 3 ? `${c.first_year}–${c.last_year}` : ranges
}

export default function ConflictTable({ rows, mode, year, nameOf, roleOf }: Props) {
  const { t } = useLang()
  const cf = t.conflicts

  return (
    <div className="conflict-table-wrap">
      <table className="conflict-table">
        <thead>
          <tr>
            <th scope="col">{cf.col.conflict}</th>
            {mode === 'country' && <th scope="col">{cf.col.role}</th>}
            <th scope="col">{cf.col.type}</th>
            <th scope="col">{mode === 'now' ? cf.col.since : cf.col.years}</th>
            <th scope="col">{cf.col.intensity}</th>
            <th scope="col" className="num">{mode === 'now' ? cf.col.deathsIn(year) : cf.col.deathsTotal}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const deaths = mode === 'now' ? latestDeaths(c) : c.deaths_total
            const war = mode === 'now' ? latestIntensity(c) === 2 : c.wars > 0
            const role = roleOf?.(c.conflict_id)
            return (
              <tr key={c.conflict_id}>
                <td>
                  <strong className="conflict-name" title={c.location}>{conflictPlace(c, nameOf)}</strong>
                  <span className="conflict-sides muted">
                    {c.side_a} <span aria-hidden="true">×</span> {c.side_b}
                  </span>
                  {c.incompat && (
                    <span className="conflict-incompat muted">
                      {cf.incompat[c.incompat]}{c.territory ? `: ${c.territory}` : ''}
                    </span>
                  )}
                </td>
                {mode === 'country' && <td>{role && <span className={`role-tag role-${role}`}>{cf.roles[role]}</span>}</td>}
                <td>
                  <span className="type-dot" style={{ background: typeColor(c.type) }} aria-hidden="true" />
                  {cf.types[c.type]}
                </td>
                <td className="num">
                  {mode === 'now' ? (c.start ? c.start.slice(0, 4) : c.first_year) : activeYears(c)}
                  {mode !== 'now' && <span className="conflict-years-count muted">{cf.yearsCount(c.years.length)}</span>}
                </td>
                <td>
                  <span className={war ? 'intensity-tag war' : 'intensity-tag'}>
                    {mode === 'now' ? cf.intensity[latestIntensity(c)] : war ? cf.warYears(c.wars) : cf.intensity[1]}
                  </span>
                </td>
                <td className="num">{deaths === null || deaths === undefined ? <span className="muted">{cf.noDeaths}</span> : int(deaths)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
