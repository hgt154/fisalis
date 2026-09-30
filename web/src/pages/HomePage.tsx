import { Link } from 'react-router'
import HeroArt from '../components/HeroArt'
import { useLang } from '../i18n/context'
import { useJson } from '../lib/data'
import { formatDate, formatUsdShort, formatValue } from '../lib/format'
import { theoriesFor } from '../lib/theories'
import { periodLabel, type SummaryRow, type TradeMeta } from '../lib/trade'
import type { IndicatorMeta, Series } from '../lib/types'
import './HomePage.css'

const lastPoint = (points?: [number, number][]) => (points && points.length ? points[points.length - 1] : null)

export default function HomePage() {
  const world = useJson<Series>('series/WLD.json')
  const meta = useJson<{ updated: string }>('meta.json')
  const trade = useJson<TradeMeta>('trade/meta.json')
  const summary = useJson<SummaryRow[]>('trade/summary.json')
  const indicators = useJson<IndicatorMeta[]>('indicators.json')
  const { t, lang } = useLang()
  const h = t.home

  const population = lastPoint(world.data?.['SP.POP.TOTL'])
  const gdp = lastPoint(world.data?.['NY.GDP.MKTP.CD'])
  const balance = summary.data?.find((r) => r.period === 'month' && r.flow === 'saldo')
  const monthPeriod = trade.data?.periods.find((p) => p.period === 'month')

  const sections = [
    { to: '/mapa', n: '01', color: 'var(--mata)', ...h.sections.map },
    { to: '/indicadores', n: '02', color: 'var(--folha)', ...h.sections.indicators, text: h.sections.indicators.text(indicators.data?.length ?? 0) },
    { to: '/comercio', n: '03', color: 'var(--jacaranda)', ...h.sections.trade },
    { to: '/teorias', n: '04', color: '#6f9a4a', ...h.sections.theories, text: h.sections.theories.text(theoriesFor(lang).length) },
    { to: null, n: '05', color: 'var(--ambar)', ...h.sections.news, link: h.soon },
  ]

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="home-hero">
        <div className="home-hero-text">
          <span className="kicker" style={{ color: 'var(--color-accent-strong)' }}>{h.kicker}</span>
          <h1 className="home-title">
            {h.titleStart}<em className="em">{h.titleEm}</em>
          </h1>
          <p className="home-lead">{h.lead}</p>
          <div className="home-actions">
            <Link className="btn btn-primary btn-lg" to="/mapa">{h.exploreMap}</Link>
            <Link className="btn btn-secondary btn-lg" to="/indicadores">{h.seeIndicators}</Link>
          </div>
        </div>
        <figure className="home-figure">
          <div className="home-frame"><HeroArt label={h.heroAlt} /></div>
          <figcaption className="muted">
            <span>{h.figcaption}</span>
          </figcaption>
        </figure>
      </section>

      {/* ---------- Stats band ---------- */}
      <div className="bleed">
        <div className="frieze frieze-lg" />
        <section className="slab home-stats num">
          <div className="home-stat">
            <span className="home-stat-label">{h.worldPopulation}</span>
            <span className="home-stat-value">{formatValue(population?.[1], 'compact')}</span>
            <span className="home-stat-note">{h.worldBank} · {population?.[0] ?? '—'}</span>
          </div>
          <div className="home-stat">
            <span className="home-stat-label">{h.worldGdp}</span>
            <span className="home-stat-value">{formatUsdShort(gdp?.[1], 2)}</span>
            <span className="home-stat-note">{h.currentUsd} · {gdp?.[0] ?? '—'}</span>
          </div>
          <div className="home-stat">
            <span className="home-stat-label">{h.tradeBalance}</span>
            <span className="home-stat-value">{formatUsdShort(balance?.value)}</span>
            <span className="home-stat-note">
              {balance ? `${balance.value >= 0 ? h.surplus : h.deficit}${monthPeriod ? ` · ${periodLabel(monthPeriod)}` : ''}` : ''}
            </span>
          </div>
          <div className="home-stat">
            <span className="home-stat-label">{h.lastUpdate}</span>
            <span className="home-stat-value">{meta.data ? formatDate(meta.data.updated) : '—'}</span>
            <span className="home-stat-note">{trade.data ? h.tradeUntil(formatDate(trade.data.latest)) : ''}</span>
          </div>
        </section>
        <div className="garden-line" />
      </div>

      {/* ---------- Five sections ---------- */}
      <div className="home-sections-head">
        <h2>{h.sectionsTitle}</h2>
        <span className="muted">{h.sectionsNote}</span>
      </div>
      <div className="home-sections">
        {sections.map((s) => {
          const body = (
            <>
              <span className="vao-head">
                <span className="vao-arch" style={{ right: 22 }} />
                <span className="vao-arch" style={{ right: 84 }} />
                <span className="vao-band" style={{ background: s.color }} />
                <span className="vao-number">{s.n}</span>
              </span>
              <span className="vao-body">
                <span className="vao-title">{s.title}</span>
                <span className="vao-text">{s.text}</span>
                <span className="vao-link" style={{ color: s.color }}>{s.link}{s.to && ' →'}</span>
              </span>
            </>
          )
          return s.to
            ? <Link key={s.n} to={s.to} className="vao">{body}</Link>
            : <div key={s.n} className="vao vao-soon" aria-disabled="true">{body}</div>
        })}
      </div>

      {/* ---------- About ---------- */}
      <section className="home-about">
        <h3>{h.about}</h3>
        <p><em>{h.whoTitle}</em> {h.who}</p>
        <p><em>{h.howTitle}</em> {h.how}</p>
        <p><em>{h.openTitle}</em> {h.open}</p>
      </section>
    </>
  )
}
