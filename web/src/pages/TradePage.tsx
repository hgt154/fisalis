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
import { useJson } from '../lib/data'
import { formatDate } from '../lib/format'
import { toFeatures, toFeaturesBy } from '../lib/geo'
import type {
  PartnerRow, PeriodKey, ProductRow, ProductSeries, SeriesIsicRow, SeriesTotalRow, StateRow, SummaryRow, TradeMeta,
} from '../lib/trade'
import './TradePage.css'

// Quick links at the top of the page -> the id of each section
const ANCHORS = [
  ['resumo', 'Resumo'],
  ['serie', 'Série'],
  ['parceiros', 'Parceiros'],
  ['estados', 'Estados'],
  ['produtos', 'Produtos'],
]

export default function TradePage() {
  const [params, setParams] = useSearchParams()

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
        <span className="kicker">Comércio exterior</span>
        <h1>A balança comercial brasileira</h1>
        <p className="muted">
          Comex Stat · Ministério do Desenvolvimento, Indústria, Comércio e Serviços
          {meta.data && ` · dados até ${formatDate(meta.data.latest)}`}
        </p>
      </div>
      <nav className="trade-anchors" aria-label="Seções da página">
        {ANCHORS.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>
    </header>
  )

  const all = [meta, summary, seriesTotal, seriesIsic, partners, states, products, productSeries]
  if (all.some((f) => f.loading)) return <>{head}<p className="muted">Carregando dados de comércio exterior…</p></>
  const failed = all.find((f) => f.error)
  if (failed) return <>{head}<p className="note">Erro ao carregar dados: {failed.error?.message}</p></>

  // The period (month / year to date / last full year) lives in the URL: ?periodo=ytd
  const period = (params.get('periodo') as PeriodKey | null) ?? 'month'
  const periodLabel = meta.data!.periods.find((p) => p.period === period)?.label ?? ''
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
        title="Quadro resumo"
        subtitle="O período escolhido aqui vale para parceiros, estados e produtos"
        actions={
          <Toggle label="Período" value={period} onChange={setPeriod}
            options={meta.data!.periods.map((p) => ({ value: p.period, label: p.label }))} />
        }
      >
        <SummaryCards rows={summary.data!} period={period} />
      </Section>

      <HistorySection total={seriesTotal.data!} isic={seriesIsic.data!} sectorCodes={sectorCodes} />
      <PartnersSection partners={partners.data!} period={period} periodLabel={periodLabel} world={world} />
      <StatesSection states={states.data!} period={period} periodLabel={periodLabel} brazil={brazil} />
      <ProductsSection products={products.data!} period={period} periodLabel={periodLabel} />
      <ProductSeriesSection series={productSeries.data!} />
    </>
  )
}
