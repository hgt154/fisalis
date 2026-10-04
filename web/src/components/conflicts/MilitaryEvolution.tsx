import { useState } from 'react'
import { useLang } from '../../i18n/context'
import { useJsonMany } from '../../lib/data'
import type { Line } from '../../lib/trade'
import type { Series } from '../../lib/types'
import TimeChart from '../TimeChart'

interface Props {
  code: string                         // the military indicator shown (e.g. MS.MIL.XPND.CD)
  ranking: string[]                    // ISO3 codes of the top countries on that measure, largest first
  nameOf: (iso3: string) => string
  format: (value: number) => string
  formatAxis: (value: number) => string
}

const MAX = 6
const START = 5
const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--cf-sb)', 'var(--cf-os)']

// The same measure year by year, for a few of the top countries (the reader picks which)
export default function MilitaryEvolution({ code, ranking, nameOf, format, formatAxis }: Props) {
  const { t } = useLang()
  const cf = t.conflicts
  const [chosen, setChosen] = useState<string[]>(() => ranking.slice(0, START))

  // Each country's file has every indicator year by year (the same files the Indicators page uses)
  const series = useJsonMany<Series>(chosen.map((iso) => `series/${iso}.json`))

  // Colors follow the position in the ranking, so a country keeps its color when others are added
  const colorOf = (iso: string) => COLORS[ranking.indexOf(iso) % COLORS.length]

  const lines: Line[] = chosen.map((iso, i) => ({
    name: nameOf(iso),
    color: colorOf(iso),
    points: (series.data[i]?.[code] ?? []).map(([year, value]) => ({ date: String(year), value })),
  }))

  const toggle = (iso: string) => {
    if (chosen.includes(iso)) setChosen(chosen.filter((x) => x !== iso))
    else if (chosen.length < MAX) setChosen([...chosen, iso].sort((a, b) => ranking.indexOf(a) - ranking.indexOf(b)))
  }

  return (
    <div className="military-evolution">
      <div className="military-pick" role="group" aria-label={cf.pickCountries(MAX)}>
        <span className="muted">{cf.pickCountries(MAX)}</span>
        {ranking.map((iso) => {
          const on = chosen.includes(iso)
          return (
            <button
              key={iso}
              type="button"
              className="pick-chip"
              aria-pressed={on}
              disabled={!on && chosen.length >= MAX}
              onClick={() => toggle(iso)}
              style={on ? { borderColor: colorOf(iso) } : undefined}
            >
              {on && <span className="pick-dot" style={{ background: colorOf(iso) }} aria-hidden="true" />}
              {nameOf(iso)}
            </button>
          )
        })}
      </div>

      {chosen.length === 0 ? (
        <p className="muted">{cf.pickNone}</p>
      ) : series.loading ? (
        <p className="muted">{t.common.loading}</p>
      ) : (
        <TimeChart lines={lines} type="line" format={format} formatAxis={formatAxis} />
      )}
    </div>
  )
}
