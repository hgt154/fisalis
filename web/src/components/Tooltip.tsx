import type { ReactNode } from 'react'

interface Props {
  x: number
  y: number
  flip?: boolean       // open to the left of the pointer (near the right edge)
  children: ReactNode
}

// Floating box positioned at (x, y) inside a relatively positioned parent
export default function Tooltip({ x, y, flip = false, children }: Props) {
  return (
    <div
      role="tooltip"
      className="tip"
      style={{ left: x + 14, top: y + 14, transform: flip ? 'translateX(calc(-100% - 28px))' : undefined }}
    >
      {children}
    </div>
  )
}
