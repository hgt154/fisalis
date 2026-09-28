import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { Topology } from 'topojson-specification'
import Toggle from '../components/Toggle'
import HistorySection from '../components/trade/HistorySection'
import PartnersSection from '../components/trade/PartnersSection'
import ProductSeriesSection from '../components/trade/ProductSeriesSection'
import ProductsSection from '../components/trade/ProductsSection'
import StatesSection from '../components/trade/StatesSection'
import SummaryCards from '../components/trade/SummaryCards'
import { useJson } from '../lib/data'
import { toFeatures, toFeaturesBy } from '../lib/geo'
import type {
  PartnerRow, PeriodKey, ProductRow, ProductSeries, SeriesIsicRow, SeriesTotalRow, StateRow, SummaryRow, TradeMeta,
} from '../lib/trade'

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

  const all = [meta, summary, seriesTotal, seriesIsic, partners, states, products, productSeries]
  if (all.some((f) => f.loading)) return <p>Carregando dados de comércio exterior…</p>
  const failed = all.find((f) => f.error)
  if (failed) return <p>Erro ao carregar dados: {failed.error?.message}</p>

  const period = (params.get('periodo') as PeriodKey | null) ?? 'month'
  const setPeriod = (p: PeriodKey) => {
    const next = new URLSearchParams(params)
    if (p === 'month') next.delete('periodo')
    else next.set('periodo', p)
    setParams(next)
  }

  return (
    <>
      <h1>Comércio Exterior do Brasil</h1>
      <p>
        Exportações e importações brasileiras: evolução histórica, países parceiros, estados e produtos.
        Dados do Comex Stat (MDIC), atualizados até {meta.data!.latest}.
      </p>

      <div style={{ position: 'sticky', top: 0, background: 'var(--color-bg)', padding: 'var(--space-sm) 0', zIndex: 20 }}>
        <Toggle label="Período" value={period} onChange={setPeriod}
          options={meta.data!.periods.map((p) => ({ value: p.period, label: p.label }))} />
      </div>

      <h2>Quadro resumo</h2>
      <SummaryCards rows={summary.data!} period={period} />

      <HistorySection total={seriesTotal.data!} isic={seriesIsic.data!} sectorCodes={sectorCodes} />
      <PartnersSection partners={partners.data!} period={period} world={world} />
      <StatesSection states={states.data!} period={period} brazil={brazil} />
      <ProductsSection products={products.data!} period={period} flow="export" />
      <ProductSeriesSection series={productSeries.data!} flow="export" />
      <ProductsSection products={products.data!} period={period} flow="import" />
      <ProductSeriesSection series={productSeries.data!} flow="import" />
    </>
  )
}