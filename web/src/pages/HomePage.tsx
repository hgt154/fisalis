import { Link } from 'react-router'
import { useJson } from '../lib/data'
import { formatValue } from '../lib/format'
import { THEORIES } from '../lib/theories'
import type { Series } from '../lib/types'
import type { TradeMeta } from '../lib/trade'

const lastValue = (points?: [number, number][]) => (points && points.length ? points[points.length - 1] : null)

const SECTIONS = [
  { to: '/mapa', title: 'Mapa', text: 'Mapa-múndi interativo: passe o mouse sobre um país para ver seus números e clique para abrir o perfil completo.' },
  { to: '/indicadores', title: 'Indicadores', text: 'Os principais indicadores do Banco Mundial por tema e por Objetivo de Desenvolvimento Sustentável, com comparação entre países.' },
  { to: '/comercio', title: 'Comércio Exterior', text: 'Exportações e importações do Brasil: parceiros, estados, produtos e séries históricas, com dados do Comex Stat.' },
  { to: '/teorias', title: 'Teorias', text: 'Teorias políticas, econômicas, de segurança, filosóficas e sociológicas para o estudo das Relações Internacionais.' },
]

export default function HomePage() {
  const world = useJson<Series>('series/WLD.json')
  const meta = useJson<{ updated: string }>('meta.json')
  const trade = useJson<TradeMeta>('trade/meta.json')

  const population = lastValue(world.data?.['SP.POP.TOTL'])
  const gdp = lastValue(world.data?.['NY.GDP.MKTP.CD'])

  return (
    <>
      <section style={{ maxWidth: 720, margin: 'var(--space-lg) 0' }}>
        <h1>Fisális — Global Affairs Data</h1>
        <p style={{ fontSize: '1.15em' }}>
          Uma plataforma aberta para estudar Relações Internacionais: dados de países, indicadores de desenvolvimento,
          comércio exterior brasileiro e as principais teorias da área, reunidos em um só lugar.
        </p>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Os dados vêm de fontes públicas — Banco Mundial e Comex Stat (MDIC) — e são atualizados automaticamente.
        </p>
      </section>

      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-lg)', margin: 'var(--space-lg) 0' }}>
        <div>
          <div style={{ color: 'var(--color-text-muted)' }}>População mundial{population && ` (${population[0]})`}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatValue(population?.[1], 'compact')}</div>
        </div>
        <div>
          <div style={{ color: 'var(--color-text-muted)' }}>PIB mundial{gdp && ` (${gdp[0]})`}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatValue(gdp?.[1], 'currency')}</div>
        </div>
        <div>
          <div style={{ color: 'var(--color-text-muted)' }}>Teorias na biblioteca</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{THEORIES.length}</div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-md)' }}>
        {SECTIONS.map((s) => (
          <Link key={s.to} to={s.to} style={{ color: 'inherit', textDecoration: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: 'var(--space-md)' }}>
            <h2 style={{ marginTop: 0 }}>{s.title} →</h2>
            <p>{s.text}</p>
          </Link>
        ))}
        <div style={{ border: '1px dashed var(--color-border)', borderRadius: 'var(--radius)', padding: 'var(--space-md)', color: 'var(--color-text-muted)' }}>
          <h2 style={{ marginTop: 0 }}>Notícias</h2>
          <p>Em breve: notícias internacionais de fontes confiáveis, resumidas com inteligência artificial.</p>
        </div>
      </section>

      <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-lg)' }}>
        {meta.data && <>Indicadores atualizados em {meta.data.updated}. </>}
        {trade.data && <>Comércio exterior até {trade.data.latest}.</>}
      </p>
    </>
  )
}