import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useTheme } from '../lib/theme'
import Logo from './Logo'
import './Header.css'

const LINKS = [
  { to: '/', label: 'Início' },
  { to: '/mapa', label: 'Mapa' },
  { to: '/indicadores', label: 'Indicadores' },
  { to: '/comercio', label: 'Comércio Exterior' },
  { to: '/teorias', label: 'Teorias' },
  { to: '/noticias', label: 'Notícias' },
]

export default function Header() {
  const { theme, toggle } = useTheme()
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

        <nav className={open ? 'site-nav open' : 'site-nav'} aria-label="Principal">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} onClick={() => setOpen(false)}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <button className="btn btn-secondary btn-icon" onClick={toggle}
            aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>
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
            aria-label="Menu" aria-expanded={open}>
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