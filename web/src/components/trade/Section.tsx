import type { ReactNode } from 'react'

// Common frame for each block of the trade page
export default function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ margin: 'var(--space-xl) 0' }}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}