/* reads meta.json from your pipeline to show the update date. */

import { useJson } from '../lib/data'

export default function Footer() {
  const { data: meta } = useJson<{ updated: string }>('meta.json')

  return (
    <footer className="container" style={{ padding: 'var(--space-lg) var(--space-md)', color: 'var(--color-text-muted)' }}>
      Dados: Banco Mundial (CC BY 4.0), Comex Stat/MDIC, Natural Earth.
      {meta && <> Atualizado em {meta.updated}.</>}
    </footer>
  )
}