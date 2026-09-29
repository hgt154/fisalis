import { Link } from 'react-router'
import HeroArt from '../components/HeroArt'
import { useJson } from '../lib/data'
import { formatDate, formatShort, formatValue } from '../lib/format'
import { THEORIES } from '../lib/theories'
import type { SummaryRow, TradeMeta } from '../lib/trade'
import type { IndicatorMeta, Series } from '../lib/types'
import './HomePage.css'

const lastPoint = (points?: [number, number][]) => (points && points.length ? points[points.length - 1] : null)

export default function HomePage() {
  const world = useJson<Series>('series/WLD.json')
  const meta = useJson<{ updated: string }>('meta.json')
  const trade = useJson<TradeMeta>('trade/meta.json')
  const summary = useJson<SummaryRow[]>('trade/summary.json')
  const indicators = useJson<IndicatorMeta[]>('indicators.json')

  const population = lastPoint(world.data?.['SP.POP.TOTL'])
  const gdp = lastPoint(world.data?.['NY.GDP.MKTP.CD'])
  const balance = summary.data?.find((r) => r.period === 'month' && r.flow === 'saldo')

  const sections = [
    { to: '/mapa', n: '01', title: 'Mapa', color: 'var(--mata)', link: 'Abrir o mapa',
      text: 'Um mapa-múndi por grupo de renda ou por qualquer indicador, com o perfil de cada país.' },
    { to: '/indicadores', n: '02', title: 'Indicadores', color: 'var(--folha)', link: 'Comparar países',
      text: `${indicators.data?.length ?? ''} indicadores do Banco Mundial, comparáveis entre até quatro países.` },
    { to: '/comercio', n: '03', title: 'Comércio Exterior', color: 'var(--jacaranda)', link: 'Ver a balança',
      text: 'Exportações e importações brasileiras por parceiro, estado e produto.' },
    { to: '/teorias', n: '04', title: 'Teorias', color: '#6f9a4a', link: 'Ler as teorias',
      text: `Uma biblioteca com ${THEORIES.length} teorias das Relações Internacionais, do Realismo às abordagens críticas.` },
    { to: null, n: '05', title: 'Notícias', color: 'var(--ambar)', link: 'Em breve',
      text: 'Notícias de fontes confiáveis, resumidas em três frases, sempre com link ao original.' },
  ]

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="home-hero">
        <div className="home-hero-text">
          <span className="kicker" style={{ color: 'var(--color-accent-strong)' }}>Dados abertos · Relações Internacionais</span>
          <h1 className="home-title">
            O mundo em números, <em className="em">para quem estuda o mundo.</em>
          </h1>
          <p className="home-lead">
            Arco reúne em uma só interface os indicadores de desenvolvimento do Banco Mundial, um mapa-múndi
            interativo, as estatísticas do comércio exterior brasileiro e uma biblioteca de teorias de RI.
            Tudo filtrável, citável e gratuito.
          </p>
          <div className="home-actions">
            <Link className="btn btn-primary btn-lg" to="/mapa">Explorar o mapa →</Link>
            <Link className="btn btn-secondary btn-lg" to="/indicadores">Ver indicadores</Link>
          </div>
        </div>
        <figure className="home-figure">
          <div className="home-frame"><HeroArt /></div>
          <figcaption className="muted">
            <span>Arcada, espelho d’água e jardim — concreto aparente e vegetação</span>
          </figcaption>
        </figure>
      </section>

      {/* ---------- Stats band ---------- */}
      <div className="bleed">
        <div className="frieze frieze-lg" />
        <section className="slab home-stats num">
          <div className="home-stat">
            <span className="home-stat-label">População mundial</span>
            <span className="home-stat-value">{formatValue(population?.[1], 'compact')}</span>
            <span className="home-stat-note">Banco Mundial · {population?.[0] ?? '—'}</span>
          </div>
          <div className="home-stat">
            <span className="home-stat-label">PIB mundial</span>
            <span className="home-stat-value">{gdp ? `US$ ${formatShort(gdp[1], 2)}` : '—'}</span>
            <span className="home-stat-note">US$ correntes · {gdp?.[0] ?? '—'}</span>
          </div>
          <div className="home-stat">
            <span className="home-stat-label">Saldo comercial BR</span>
            <span className="home-stat-value">{balance ? `US$ ${formatShort(balance.value)}` : '—'}</span>
            <span className="home-stat-note">
              {balance ? `${balance.value >= 0 ? 'Superávit' : 'Déficit'} · ${balance.label}` : ''}
            </span>
          </div>
          <div className="home-stat">
            <span className="home-stat-label">Última atualização</span>
            <span className="home-stat-value">{meta.data ? formatDate(meta.data.updated) : '—'}</span>
            <span className="home-stat-note">{trade.data ? `Comércio até ${formatDate(trade.data.latest)}` : ''}</span>
          </div>
        </section>
        <div className="garden-line" />
      </div>

      {/* ---------- Five sections ---------- */}
      <div className="home-sections-head">
        <h2>Cinco maneiras de ler o sistema internacional</h2>
        <span className="muted">Cinco vãos sob a mesma laje</span>
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
        <h3>Sobre o projeto</h3>
        <p><em>Para quem.</em> Estudantes e pesquisadores de Relações Internacionais, jornalistas e leitores
          curiosos que precisam de números confiáveis sem abrir cinco portais diferentes.</p>
        <p><em>Como funciona.</em> Os dados são coletados das fontes oficiais, padronizados em pt-BR e
          atualizados automaticamente. Cada número informa o ano de referência e leva à definição original.</p>
        <p><em>Código aberto.</em> Metodologia, pipelines e esta interface estão publicados no GitHub.
          Correções e sugestões são bem-vindas.</p>
      </section>
    </>
  )
}