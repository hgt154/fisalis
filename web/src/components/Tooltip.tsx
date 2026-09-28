// one tooltip style shared by all charts

import type { ReactNode } from 'react'

// Floating box positioned at (x, y) inside a relatively positioned parent
export default function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      role="tooltip"
      style={{
        position: 'absolute',
        left: x + 12,
        top: y + 12,
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-xs) var(--space-sm)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        zIndex: 10,
      }}
    >
      {children}
    </div>
  )
}