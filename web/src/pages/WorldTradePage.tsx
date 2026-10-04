import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { Topology } from 'topojson-specification'
import PageIntro from '../components/PageIntro'
import Toggle from '../components/Toggle'
import HistorySection from '../components/trade/HistorySection'
import PartnersSection from '../components/trade/PartnersSection'
import Section from '../components/trade/Section'
import SummaryCards from '../components/trade/SummaryCards'
import TradeTabs from '../components/trade/TradeTabs'
import WorldProductsSection from '../components/trade/WorldProductsSection'
import { useLang } from '../i18n/context'
import { useJson } from '../lib/data'
import { formatDate } from '../lib/format'
import { toFeatures } from '../lib/geo'
import { countryName } from '../lib/names'
import { periodLabel, type PeriodKey } from '../lib/trade'
import type { Country } from '../lib/types'
import {
  WORLD, annualSeries, monthlySeries, pickPeriod, worldPartners, worldPeriods, worldSummary,
  type WorldTradeFile, type WorldTradeIndex,
} from '../lib/worldTrade'
import type { ProductsFile, ProductsIndex } from '../lib/worldProducts'
import './TradePage.css'

const ANCHORS = ['resumo', 'serie', 'parceiros', 'produtos'] as const

// /comercio/mundo?pais=DEU — any economy's trade with the world, from the IMF
export default function WorldTradePage() {
  const [params, setParams] = useSearchParams()
  const { t, lang } = useLang()
  const tr = t.trade
  const wt = t.worldTrade
  const iso = (params.get('pais') ?? WORLD).toUpperCase()

  const index = useJson<WorldTradeIndex>('trade_world/index.json')
  const countries = useJson<Country[]>('countries.json')
  const worldTopo = useJson<Topology>('world.topo.json')
  const known = index.data?.economies.some((e) => e.iso3 === iso) ?? false
  const file = useJson<WorldTradeFile>(known ? `trade_world/${iso}.json` : null)
  const world = useMemo(() => (worldTopo.data ? toFeatures(worldTopo.data) : []), [worldTopo.data])

  // Products (CEPII BACI, yearly): a separate index, since a few economies are only in one source
  const productsIndex = useJson<ProductsIndex>('trade_products/index.json')
  const hasProducts = productsIndex.data?.economies.some((e) => e.iso3 === iso) ?? false
  const products = useJson<ProductsFile>(hasProducts ? `trade_products/${iso}.json` : null)

  // Names: our country list first, then the extra names the pipeline adds (e.g. Taiwan), then the code
  const byIso = useMemo(() => new Map((countries.data ?? []).map((c) => [c.iso3, c])), [countries.data])
  const extra = useMemo(() => new Map((index.data?.partner_names ?? []).map((p) => [p.iso3, p])), [index.data])
  const nameOf = (code: string) => {
    if (code === WORLD) return wt.world
    const c = byIso.get(code)
    if (c) return countryName(c, lang)
    const p = extra.get(code)
    return p ? (lang === 'pt' ? p.name_pt || p.name_en : p.name_en) : code
  }
  const partnerInfo = (code: string) => ({
    name: nameOf(code),
    continent: byIso.get(code)?.continent ?? extra.get(code)?.continent ?? null,
  })

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value === null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  // The picker: World first, then every economy by name in the current language
  const economies = (index.data?.economies ?? [])
    .filter((e) => e.iso3 !== WORLD)
    .map((e) => ({ iso3: e.iso3, name: nameOf(e.iso3) }))
    .sort((a, b) => a.name.localeCompare(b.name, lang))
  const entry = index.data?.economies.find((e) => e.iso3 === iso)
  const latest = entry?.last_month ? formatDate(entry.last_month) : entry?.last_year ? String(entry.last_year) : null

  const head = (
    <>
      <TradeTabs />
      <header className="trade-head">
        <div className="page-head">
          <span className="kicker">{tr.kicker} · {t.tradeTabs.world}</span>
          <h1>{iso === WORLD ? wt.worldTitle : nameOf(iso)}</h1>
          <p className="muted">{wt.source}{latest && tr.dataUntil(latest)}</p>
        </div>
        <nav className="trade-anchors" aria-label={tr.sectionsNav}>
          {ANCHORS.map((id) => <a key={id} href={`#${id}`}>{tr.anchors[id]}</a>)}
        </nav>
      </header>
      <div className="world-picker">
        <label htmlFor="world-economy">{wt.economy}</label>
        <select id="world-economy" value={known ? iso : ''} onChange={(e) => setParam('pais', e.target.value === WORLD ? null : e.target.value)}>
          {!known && <option value="" disabled>{iso}</option>}
          <option value={WORLD}>{wt.world}</option>
          {economies.map((e) => <option key={e.iso3} value={e.iso3}>{e.name}</option>)}
        </select>
      </div>
    </>
  )

  if (index.loading || countries.loading) return <>{head}<p className="muted">{wt.loading}</p></>
  if (index.error) return <>{head}<p className="note">{tr.loadError(index.error.message)}</p></>
  if (!known) return <>{head}<p className="note">{wt.notFound(iso)}</p></>
  if (file.loading) return <>{head}<p className="muted">{wt.loading}</p></>
  if (!file.data) return <>{head}<p className="note">{tr.loadError(file.error?.message ?? '')}</p></>

  const data = file.data
  const periods = worldPeriods(data)
  const periodInfo = pickPeriod((params.get('periodo') as PeriodKey | null) ?? 'month', periods)
  const summary = worldSummary(data, periods)
  const monthly = monthlySeries(data)
  const partners = worldPartners(data, partnerInfo)

  const worldLast = index.data?.economies.find((e) => e.iso3 === WORLD)?.last_month
  const intro = (
    <PageIntro
      id="trade-world"
      lead={t.intro.world.lead}
      facts={[
        { label: t.intro.totals, value: t.intro.world.totals(worldLast ? formatDate(worldLast) : '—') },
        ...(productsIndex.data
          ? [{ label: t.intro.products, value: t.intro.world.products(productsIndex.data.first_year, productsIndex.data.year) }]
          : []),
        { label: t.intro.values, value: t.intro.world.values },
        { label: t.intro.note, value: t.intro.world.note },
      ]}
    />
  )

  return (
    <>
      {head}
      {intro}
      {iso === 'BRA' && <p className="note note-info world-note">{wt.brazilNote}</p>}

      <Section
        id="resumo"
        title={tr.summary}
        subtitle={wt.summaryNote}
        actions={periods.length > 1 && periodInfo && (
          <Toggle label={t.common.period} value={periodInfo.period}
            onChange={(p) => setParam('periodo', p === 'month' ? null : p)}
            options={periods.map((p) => ({ value: p.period, label: periodLabel(p) }))} />
        )}
      >
        {periodInfo && <SummaryCards rows={summary} period={periodInfo.period} periodInfo={periodInfo} />}
        {monthly.length === 0 && <p className="trade-source muted">{wt.noMonthly}</p>}
      </Section>

      <HistorySection
        key={iso}   // start each economy from the default chart options
        total={monthly}
        annual={annualSeries(data)}
        sourceNote={wt.sourceNote}
        subtitle={wt.historySubtitle}
      />

      {partners.year !== null ? (
        <PartnersSection labels={iso === WORLD ? wt.worldPartners : undefined} partners={partners.rows} period="year" periodName={String(partners.year)} world={world} />
      ) : (
        <Section id="parceiros" title={tr.partners}>
          <p className="muted">{wt.noPartners}</p>
        </Section>
      )}

      {productsIndex.data && !products.loading && (
        <WorldProductsSection index={productsIndex.data} file={products.data} iso3={iso} />
      )}
    </>
  )
}
