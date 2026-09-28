import { useJson } from '../lib/data'
import type { TradeMeta } from '../lib/trade'
import Logo from './Logo'
import './Footer.css'

const REPO_URL = 'https://github.com/hgt154/fisalis'

// "2026-09-15" -> "15 set. 2026";  "2026-08" -> "ago. 2026"
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const options: Intl.DateTimeFormatOptions = d ? { day: '2-digit', month: 'short', year: 'numeric' } : { month: 'short', year: 'numeric' }
  return new Date(y, m - 1, d || 1).toLocaleDateString('pt-BR', options).replace(/ de /g, ' ')
}

export default function Footer() {
  const { data: meta } = useJson<{ updated: string }>('meta.json')
  const { data: trade } = useJson<TradeMeta>('trade/meta.json')

  return (
    <footer className="slab site-footer">
      <div className="frieze frieze-lg" />
      <div className="footer-grid">
        <div className="footer-brand">
          <span className="footer-logo"><Logo size={35} /><span>Arco</span></span>
          <p>Dados abertos para o estudo das Relações Internacionais. Um projeto independente, sem fins lucrativos.</p>
        </div>
        <div className="footer-col">
          <span className="kicker">Fontes de dados</span>
          <span>Banco Mundial — WDI · <span className="muted">CC BY 4.0</span></span>
          <span>Comex Stat · MDIC</span>
          <span>Natural Earth · <span className="muted">domínio público</span></span>
        </div>
        <div className="footer-col num">
          <span className="kicker">Atualização</span>
          {meta && <span>Indicadores: {formatDate(meta.updated)}</span>}
          {trade && <span>Comércio: dados até {formatDate(trade.latest)}</span>}
        </div>
        <div className="footer-col">
          <span className="kicker">Projeto</span>
          <a href={REPO_URL}>GitHub</a>
          <a href={`${REPO_URL}/blob/main/docs/data_notes.md`}>Metodologia</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Arco · Global Affairs Data</span>
        <span>Dados reproduzidos conforme as licenças de cada fonte.</span>
      </div>
    </footer>
  )
}