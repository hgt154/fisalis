import type { ReactNode } from 'react'

interface Props {
  x: number
  y: number
  flip?: boolean       // open to the left of the pointer (near the right edge)
  above?: boolean      // open above the point instead of below (small charts, like sparklines)
  children: ReactNode
}

// Floating box positioned at (x, y) inside a relatively positioned parent
export default function Tooltip({ x, y, flip = false, above = false, children }: Props) {
  const moves = [
    flip && 'translateX(calc(-100% - 28px))',
    above && 'translateY(calc(-100% - 28px))',
  ].filter(Boolean).join(' ')

  return (
    <div role="tooltip" className="tip" style={{ left: x + 14, top: y + 14, transform: moves || undefined }}>
      {children}
    </div>
  )
}
