import { NavLink } from 'react-router'
import { useLang } from '../../i18n/context'

// Brasil | Mundo — two pages under /comercio, shown as tabs at the top of both
export default function TradeTabs() {
  const { t } = useLang()
  return (
    <nav className="tabs trade-tabs" aria-label={t.tradeTabs.label}>
      <NavLink to="/comercio" end className="tab">{t.tradeTabs.brazil}</NavLink>
      <NavLink to="/comercio/mundo" className="tab">{t.tradeTabs.world}</NavLink>
    </nav>
  )
}
