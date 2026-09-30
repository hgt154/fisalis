import { useMemo, useState } from 'react'
import { hierarchy, treemap, type HierarchyRectangularNode } from 'd3'
import { getLocale } from '../lib/format'
import { useWidth } from '../lib/useWidth'
import Tooltip from './Tooltip'

export interface TreemapItem {
  id: string
  label: string
  group: string       // e.g. continent or sector: items of a group sit together
  value: number
  color: string
  ink?: string        // text color inside the box (dark text on light colors)
  share: number       // 0.253 -> "25,3%" inside the box
  tooltip: string[]   // lines shown on hover
}

interface Props {
  items: TreemapItem[]
  width?: number      // proportions at full size; the treemap is drawn at the real width of its column
  height?: number
}

interface Node {
  name: string
  item?: TreemapItem
  children?: Node[]
}

const pct = (share: number) => `${(share * 100).toLocaleString(getLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

export default function Treemap({ items, width: baseWidth = 960, height: baseHeight = 480 }: Props) {
  const [boxRef, width] = useWidth<HTMLDivElement>(baseWidth)
  // Same proportions as the base size, but never shorter than 320 px (phones)
  const height = Math.max(Math.round((width * baseHeight) / baseWidth), 320)
  const [hover, setHover] = useState<{ item: TreemapItem; x: number; y: number; flip: boolean } | null>(null)

  const leaves = useMemo(() => {
    const groups = [...new Set(items.map((i) => i.group))]
    const root: Node = {
      name: 'root',
      children: groups.map((g) => ({
        name: g,
        children: items.filter((i) => i.group === g && i.value > 0).map((i) => ({ name: i.id, item: i })),
      })),
    }
    const layout = treemap<Node>().size([width, height]).paddingInner(2).round(true)
    const tree = layout(hierarchy(root).sum((d) => d.item?.value ?? 0).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)))
    return tree.leaves() as HierarchyRectangularNode<Node>[]
  }, [items, width, height])

  return (
    <div ref={boxRef} style={{ position: 'relative' }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {leaves.map((leaf) => {
          const item = leaf.data.item!
          const w = leaf.x1 - leaf.x0
          const h = leaf.y1 - leaf.y0
          // Bigger boxes get bigger names; tiny boxes get only the share, or nothing
          const size = w > 180 && h > 90 ? 22 : 14
          const maxChars = Math.floor(w / (size * 0.52))
          const name = item.label.length > maxChars ? `${item.label.slice(0, Math.max(maxChars - 1, 1))}…` : item.label
          return (
            <g
              key={item.id}
              transform={`translate(${leaf.x0},${leaf.y0})`}
              onMouseMove={(e) => {
                const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                const x = e.clientX - box.left
                setHover({ item, x, y: e.clientY - box.top, flip: x > box.width * 0.6 })
              }}
            >
              <rect width={w} height={h} fill={item.color} />
              <g fill={item.ink ?? '#fff'} style={{ pointerEvents: 'none' }}>
                {w > 60 && h > 40 ? (
                  <text x={7} y={size + 4} fontSize={size} fontFamily="var(--font-heading)" fontWeight={600}>
                    <tspan>{name}</tspan>
                    <tspan x={7} dy={size * 0.95} fontSize={12} fontFamily="var(--font-body)" fontWeight={400} opacity={0.85}>{pct(item.share)}</tspan>
                  </text>
                ) : w > 30 && h > 18 ? (
                  <text x={4} y={14} fontSize={11} opacity={0.85}>{pct(item.share)}</text>
                ) : null}
              </g>
            </g>
          )
        })}
      </svg>
      {hover && (
        <Tooltip x={hover.x} y={hover.y} flip={hover.flip}>
          <strong>{hover.item.label}</strong>
          {hover.item.tooltip.map((line) => <span key={line}>{line}</span>)}
        </Tooltip>
      )}
    </div>
  )
}
