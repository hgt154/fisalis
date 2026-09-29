import type { ReactNode } from 'react'

interface Props {
  id: string              // anchor for the page's quick links (#parceiros)
  title: string
  subtitle?: ReactNode    // one line of context under the title
  actions?: ReactNode     // controls on the right of the title
  children: ReactNode
}

// Common frame for each block of the trade page: a rule on top, title + context, controls on the right
export default function Section({ id, title, subtitle, actions, children }: Props) {
  return (
    <section id={id} className="trade-section">
      <header className="trade-section-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {actions && <div className="trade-actions">{actions}</div>}
      </header>
      {children}
    </section>
  )
}
