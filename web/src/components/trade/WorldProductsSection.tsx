import { useMemo, useState } from 'react'
import { useLang } from '../../i18n/context'
import { formatChange, formatUsdShort, getLocale } from '../../lib/format'
import {
  basketShares, chapterRows, concentrationLevel, concentrationRank, groupColor, groupInk, groupShares,
  type ProductFlow, type ProductsFile, type ProductsIndex,
} from '../../lib/worldProducts'
import Sparkline from '../Sparkline'
import StackedShareChart from '../StackedShareChart'
import Toggle from '../Toggle'
import Treemap from '../Treemap'
import Section from './Section'

interface Props {
  index: ProductsIndex
  file: ProductsFile | null    // null: no BACI data for this economy
  iso3: string
}

const pct = (share: number) =>
  `${(share * 100).toLocaleString(getLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
const hhiText = (hhi: number) => hhi.toLocaleString(getLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// One treemap: the chapters of one flow, colored by group
function Column({ file, index, flow }: { file: ProductsFile; index: ProductsIndex; flow: ProductFlow }) {
  const { t, lang } = useLang()
  const tr = t.trade
  const rows = useMemo(() => chapterRows(file, index, flow, lang), [file, index, flow, lang])
  const groupName = useMemo(
    () => new Map(index.groups.map((g) => [g.group, lang === 'pt' ? g.name_pt : g.name_en])),
    [index, lang],
  )
  const total = rows.reduce((sum, r) => sum + r.value, 0)

  return (
    <div>
      <header className="products-head">
        <h3>{flow === 'export' ? tr.exported : tr.imported}</h3>
        <span className="muted num">{formatUsdShort(total)}</span>
      </header>
      <Treemap
        width={620}
        height={440}
        items={rows.map((r) => ({
          id: r.chapter,
          label: r.name,
          group: r.group,
          value: r.value,
          share: r.share,
          color: groupColor(r.group),
          ink: groupInk(r.group),
          tooltip: [
            groupName.get(r.group) ?? '',
            tr.value(formatUsdShort(r.value, 2)),
            tr.change(formatChange(r.var_pct)),
            tr.share(pct(r.share)),
          ],
        }))}
      />
    </div>
  )
}

export default function WorldProductsSection({ index, file, iso3 }: Props) {
  const { t, lang } = useLang()
  const tr = t.trade
  const wp = t.worldProducts
  const [basketFlow, setBasketFlow] = useState<ProductFlow>('export')

  const groupKeys = index.groups.map((g) => g.group)
  const groupName = (g: string) => {
    const meta = index.groups.find((x) => x.group === g)
    return meta ? (lang === 'pt' ? meta.name_pt : meta.name_en) : g
  }
  const legend = file ? groupShares(chapterRows(file, index, 'export', lang), index) : []
  const basket = file ? basketShares(file, groupKeys, basketFlow) : []

  const latest = file?.concentration.at(-1)
  const rank = concentrationRank(index, iso3)
  const flowOptions = [
    { value: 'export' as const, label: tr.exports },
    { value: 'import' as const, label: tr.imports },
  ]

  return (
    <Section id="produtos" title={wp.title} subtitle={wp.subtitle(index.year)}>
      {!file ? (
        <p className="muted">{wp.noData}</p>
      ) : (
        <>
          <ul className="trade-legend">
            {legend.filter((g) => g.share > 0).map((g) => (
              <li key={g.group}>
                <span className="legend-swatch" style={{ background: groupColor(g.group) }} />
                {groupName(g.group)} <span className="muted num">{pct(g.share)}</span>
              </li>
            ))}
          </ul>
          <p className="trade-legend-note muted">{wp.legendNote}</p>

          <div className="products-grid">
            <Column file={file} index={index} flow="export" />
            <Column file={file} index={index} flow="import" />
          </div>

          <div className="trade-split products-history">
            <div>
              <div className="products-subhead">
                <div>
                  <h3>{wp.basketTitle}</h3>
                  <p className="muted">{wp.basketSubtitle(basketFlow === 'export' ? wp.ofExports : wp.ofImports, basket[0]?.year ?? index.first_year, index.year)}</p>
                </div>
                <Toggle label={t.common.flow} value={basketFlow} onChange={setBasketFlow} options={flowOptions} />
              </div>
              <StackedShareChart years={basket} keys={groupKeys} colorOf={groupColor} labelOf={groupName} />
            </div>

            {latest && (
              <aside className="concentration-card">
                <p className="kicker">{wp.concentrationTitle}</p>
                <p className="concentration-value num">{hhiText(latest.hhi)}</p>
                <p className="concentration-level">{wp.levels[concentrationLevel(latest.hhi)]}</p>
                {rank && <p className="muted concentration-rank">{wp.rank(rank.position, rank.total)}</p>}
                <Sparkline
                  height={56}
                  fromYear={file.concentration[0].year}
                  toYear={latest.year}
                  format={hhiText}
                  series={[{ name: wp.concentrationShort, color: 'var(--flow-export)', points: file.concentration.map((c) => [c.year, c.hhi]) }]}
                />
                <p className="spark-years muted num"><span>{file.concentration[0].year}</span><span>{latest.year}</span></p>
                <p className="muted concentration-note">{wp.concentrationNote}</p>
              </aside>
            )}
          </div>
        </>
      )}
      <p className="trade-source muted">{wp.sourceNote(index.version, index.year)}</p>
    </Section>
  )
}
