import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useLang } from '../i18n/context'
import { useTheme } from '../lib/theme'
import Logo from './Logo'
import './Header.css'

// Paths stay in Portuguese in both languages; only the labels change
const LINKS = [
  { to: '/', key: 'home' },
  { to: '/mapa', key: 'map' },
  { to: '/indicadores', key: 'indicators' },
  { to: '/comercio', key: 'trade' },
  { to: '/teorias', key: 'theories' },
  { to: '/noticias', key: 'news' },
] as const

export default function Header() {
  const { theme, toggle } = useTheme()
  const { lang, setLang, t } = useLang()
  const [open, setOpen] = useState(false)

  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <Logo size={32} />
          <span className="brand-text">
            <span className="brand-name">Arco</span>
            <span className="brand-tag">Global Affairs Data</span>
          </span>
        </Link>

        <nav className={open ? 'site-nav open' : 'site-nav'} aria-label={t.nav.main}>
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} onClick={() => setOpen(false)}>
              {t.nav[link.key]}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <div className="seg lang-switch" role="group" aria-label={t.common.language}>
            {(['pt', 'en'] as const).map((l) => (
              <button key={l} type="button" className="seg-opt" aria-pressed={lang === l} lang={l === 'pt' ? 'pt-BR' : 'en'}
                onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button className="btn btn-secondary btn-icon" onClick={toggle}
            aria-label={theme === 'dark' ? t.nav.lightTheme : t.nav.darkTheme}>
            {theme === 'dark' ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>
          <button className="btn btn-secondary btn-icon menu-button" onClick={() => setOpen(!open)}
            aria-label={t.nav.menu} aria-expanded={open}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </header>
      <div className="frieze" />
    </>
  )
}
