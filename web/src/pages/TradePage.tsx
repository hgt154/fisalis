import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { Topology } from 'topojson-specification'
import Toggle from '../components/Toggle'
import HistorySection from '../components/trade/HistorySection'
import PartnersSection from '../components/trade/PartnersSection'
import ProductSeriesSection from '../components/trade/ProductSeriesSection'
import ProductsSection from '../components/trade/ProductsSection'
import Section from '../components/trade/Section'
import StatesSection from '../components/trade/StatesSection'
import SummaryCards from '../components/trade/SummaryCards'
import { useLang } from '../i18n/context'
import { useJson } from '../lib/data'
import { formatDate } from '../lib/format'
import { toFeatures, toFeaturesBy } from '../lib/geo'
import {
  periodLabel, type PartnerRow, type PeriodKey, type ProductRow, type ProductSeries, type SeriesIsicRow,
  type SeriesTotalRow, type StateRow, type SummaryRow, type TradeMeta,
} from '../lib/trade'
import './TradePage.css'

// Quick links at the top of the page -> the id of each section (labels in the dictionary)
const ANCHORS = ['resumo', 'serie', 'parceiros', 'estados', 'produtos'] as const

export default function TradePage() {
  const [params, setParams] = useSearchParams()
  const { t } = useLang()
  const tr = t.trade

  const meta = useJson<TradeMeta>('trade/meta.json')
  const summary = useJson<SummaryRow[]>('trade/summary.json')
  const seriesTotal = useJson<SeriesTotalRow[]>('trade/series_total.json')
  const seriesIsic = useJson<SeriesIsicRow[]>('trade/series_isic.json')
  const partners = useJson<PartnerRow[]>('trade/partners.json')
  const states = useJson<StateRow[]>('trade/states.json')
  const products = useJson<ProductRow[]>('trade/products.json')
  const productSeries = useJson<ProductSeries[]>('trade/product_series.json')
  const worldTopo = useJson<Topology>('world.topo.json')
  const brazilTopo = useJson<Topology>('brazil.topo.json')

  const world = useMemo(() => (worldTopo.data ? toFeatures(worldTopo.data) : []), [worldTopo.data])
  const brazil = useMemo(() => (brazilTopo.data ? toFeaturesBy(brazilTopo.data, 'states', 'uf') : []), [brazilTopo.data])
  const sectorCodes = useMemo(
    () => new Map((products.data ?? []).map((p) => [p.section, p.section_code])),
    [products.data],
  )

  const head = (
    <header className="trade-head">
      <div className="page-head">
        <span className="kicker">{tr.kicker}</span>
        <h1>{tr.title}</h1>
        <p className="muted">
          {tr.source}
          {meta.data && tr.dataUntil(formatDate(meta.data.latest))}
        </p>
        {tr.namesNote && <p className="muted trade-names-note">{tr.namesNote}</p>}
      </div>
      <nav className="trade-anchors" aria-label={tr.sectionsNav}>
        {ANCHORS.map((id) => <a key={id} href={`#${id}`}>{tr.anchors[id]}</a>)}
      </nav>
    </header>
  )

  const all = [meta, summary, seriesTotal, seriesIsic, partners, states, products, productSeries]
  if (all.some((f) => f.loading)) return <>{head}<p className="muted">{tr.loading}</p></>
  const failed = all.find((f) => f.error)
  if (failed) return <>{head}<p className="note">{tr.loadError(failed.error?.message ?? '')}</p></>

  // The period (month / year to date / last full year) lives in the URL: ?periodo=ytd
  const period = (params.get('periodo') as PeriodKey | null) ?? 'month'
  // Period names are built from the months, so they follow the language ("Agosto 2026" / "August 2026")
  const periodInfo = meta.data!.periods.find((p) => p.period === period)
  const periodName = periodInfo ? periodLabel(periodInfo) : ''
  const setPeriod = (p: PeriodKey) => {
    const next = new URLSearchParams(params)
    if (p === 'month') next.delete('periodo')
    else next.set('periodo', p)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  return (
    <>
      {head}

      <Section
        id="resumo"
        title={tr.summary}
        subtitle={tr.summaryNote}
        actions={
          <Toggle label={t.common.period} value={period} onChange={setPeriod}
            options={meta.data!.periods.map((p) => ({ value: p.period, label: periodLabel(p) }))} />
        }
      >
        <SummaryCards rows={summary.data!} period={period} periodInfo={periodInfo} />
      </Section>

      <HistorySection total={seriesTotal.data!} isic={seriesIsic.data!} sectorCodes={sectorCodes} />
      <PartnersSection partners={partners.data!} period={period} periodName={periodName} world={world} />
      <StatesSection states={states.data!} period={period} periodName={periodName} brazil={brazil} />
      <ProductsSection products={products.data!} period={period} periodName={periodName} />
      <ProductSeriesSection series={productSeries.data!} />
    </>
  )
}
