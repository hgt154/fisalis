/* NavLink is a link that knows when it's the active page, so the design can highlight it later. */

import { NavLink } from 'react-router'

const links = [
  { to: '/', label: 'Início' },
  { to: '/mapa', label: 'Mapa' },
  { to: '/indicadores', label: 'Indicadores' },
  { to: '/comercio', label: 'Comércio Exterior' },
  { to: '/teorias', label: 'Teorias' },
  { to: '/noticias', label: 'Notícias' },
]

export default function Header() {
  return (
    <header className="container">
            <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', padding: 'var(--space-md) 0' }}>
        <strong>Fisális</strong>
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}