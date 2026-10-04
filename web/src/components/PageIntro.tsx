import { useState, type ReactNode } from 'react'
import { useLang } from '../i18n/context'
import './PageIntro.css'

export interface Fact {
  label: string
  value: ReactNode
}

interface Props {
  id: string            // remembers, per page, whether the reader folded the box away
  lead: ReactNode       // one short paragraph: what this page shows
  facts: Fact[]         // source, coverage, update, caveats…
}

const storageKey = (id: string) => `arco-intro-${id}`

function initiallyOpen(id: string): boolean {
  try {
    return localStorage.getItem(storageKey(id)) !== 'closed'
  } catch {
    return true   // private mode or blocked storage: just show it
  }
}

// "About this data": what the page contains and where the numbers come from, under the title
export default function PageIntro({ id, lead, facts }: Props) {
  const { t } = useLang()
  const [open, setOpen] = useState(() => initiallyOpen(id))

  const toggle = (next: boolean) => {
    setOpen(next)
    try {
      if (next) localStorage.removeItem(storageKey(id))
      else localStorage.setItem(storageKey(id), 'closed')
    } catch {
      // nothing to do: the choice just won't be remembered
    }
  }

  return (
    <details className="page-intro" open={open} onToggle={(e) => toggle(e.currentTarget.open)}>
      <summary className="kicker">{t.intro.about}</summary>
      <div className="page-intro-body">
        <p className="page-intro-lead">{lead}</p>
        <dl className="page-intro-facts">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="kicker">{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  )
}
