import { useLang } from '../i18n/context'
import { useJson } from '../lib/data'
import { formatDate } from '../lib/format'
import type { TradeMeta } from '../lib/trade'
import Logo from './Logo'
import './Footer.css'

const REPO_URL = 'https://github.com/hgt154/fisalis'

export default function Footer() {
  const { data: meta } = useJson<{ updated: string }>('meta.json')
  const { data: trade } = useJson<TradeMeta>('trade/meta.json')
  const { t } = useLang()

  return (
    <footer className="slab site-footer">
      <div className="frieze frieze-lg" />
      <div className="footer-grid">
        <div className="footer-brand">
          <span className="footer-logo"><Logo size={35} /><span>Arco</span></span>
          <p>{t.footer.tagline}</p>
        </div>
        <div className="footer-col">
          <span className="kicker">{t.footer.sources}</span>
          <span>{t.footer.worldBank} · <span className="muted">CC BY 4.0</span></span>
          <span>Comex Stat · MDIC</span>
          <span>{t.footer.imf} · <span className="muted">IMTS</span></span>
          <span>Natural Earth · <span className="muted">{t.footer.publicDomain}</span></span>
        </div>
        <div className="footer-col num">
          <span className="kicker">{t.footer.updates}</span>
          {meta && <span>{t.footer.indicators(formatDate(meta.updated))}</span>}
          {trade && <span>{t.footer.trade(formatDate(trade.latest))}</span>}
        </div>
        <div className="footer-col">
          <span className="kicker">{t.footer.project}</span>
          <a href={REPO_URL}>GitHub</a>
          <a href={`${REPO_URL}/blob/main/docs/data_notes.md`}>{t.footer.methodology}</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Arco · Global Affairs Data</span>
        <span>{t.footer.licenses}</span>
      </div>
    </footer>
  )
}
