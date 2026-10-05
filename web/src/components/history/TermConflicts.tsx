import { useMemo } from 'react'
import { Link } from 'react-router'
import { useLang } from '../../i18n/context'
import { conflictPlace, normalizeConflicts, typeColor, yearRanges, type Conflict } from '../../lib/conflicts'
import { useJson } from '../../lib/data'

interface Props {
  iso3: string
  years: number[]          // every calendar year of the term
  nameOf: (iso3: string) => string
}

// UCDP conflicts in which the country was the location or a party, during the term
export default function TermConflicts({ iso3, years, nameOf }: Props) {
  const { t } = useLang()
  const r = t.ruler
  const all = useJson<Conflict[]>('conflicts/conflicts.json')
  const conflicts = useMemo(() => normalizeConflicts(all.data ?? []), [all.data])

  if (all.loading) return <p className="muted">{t.common.loading}</p>
  if (!all.data) return null

  const rows = conflicts
    .map((c) => {
      const role = c.countries.find((x) => x.iso3 === iso3 && (x.role === 'location' || x.role === 'party'))?.role
      const inTerm = c.years.filter((y) => years.includes(y))
      return role && inTerm.length > 0 ? { c, role: role as 'location' | 'party', inTerm } : null
    })
    .filter((x): x is { c: Conflict; role: 'location' | 'party'; inTerm: number[] } => x !== null)
    .sort((a, b) => a.inTerm[0] - b.inTerm[0])

  return (
    <div className="term-conflicts">
      {rows.length === 0 ? (
        <p className="muted">{r.noConflicts}</p>
      ) : (
        <ul>
          {rows.map(({ c, role, inTerm }) => (
            <li key={c.conflict_id}>
              <span className="term-conflict-dot" style={{ background: typeColor(c.type) }} aria-hidden="true" />
              <div>
                <strong>{conflictPlace(c, nameOf)}</strong>
                <span className="muted"> · {c.side_a} – {c.side_b}</span>
                <div className="muted">{t.conflicts.types[c.type]} · {r.roles[role]} · {yearRanges(inTerm)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="term-note muted">{r.conflictsNote} <Link to="/conflitos">{r.seeConflicts} →</Link></p>
    </div>
  )
}
