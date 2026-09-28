// nested rectangles for partners and products.

import { useMemo, useState } from 'react'
import { hierarchy, treemap, type HierarchyRectangularNode } from 'd3'
import Tooltip from './Tooltip'

const W = 960
const H = 480

export interface TreemapItem {
  id: string
  label: string
  group: string       // e.g. continent or sector: items of a group sit together
  value: number
  color: string
  share: number       // 0.253 -> "25,3%" inside the box
  tooltip: string[]   // lines shown on hover
}

interface Node {
  name: string
  item?: TreemapItem
  children?: Node[]
}

export default function Treemap({ items }: { items: TreemapItem[] }) {
  const [hover, setHover] = useState<{ item: TreemapItem; x: number; y: number } | null>(null)

  const leaves = useMemo(() => {
    const groups = [...new Set(items.map((i) => i.group))]
    const root: Node = {
      name: 'root',
      children: groups.map((g) => ({
        name: g,
        children: items.filter((i) => i.group === g && i.value > 0).map((i) => ({ name: i.id, item: i })),
      })),
    }
    const layout = treemap<Node>().size([W, H]).paddingInner(1).round(true)
    const tree = layout(hierarchy(root).sum((d) => d.item?.value ?? 0).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)))
    return tree.leaves() as HierarchyRectangularNode<Node>[]
  }, [items])

  return (
    <div style={{ position: 'relative' }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {leaves.map((leaf) => {
          const item = leaf.data.item!
          const w = leaf.x1 - leaf.x0
          const h = leaf.y1 - leaf.y0
          return (
            <g
              key={item.id}
              transform={`translate(${leaf.x0},${leaf.y0})`}
              onMouseMove={(e) => {
                const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                setHover({ item, x: e.clientX - box.left, y: e.clientY - box.top })
              }}
            >
              <rect width={w} height={h} fill={item.color} />
              {w > 70 && h > 36 && (
                <text x={6} y={16} fontSize={12} fill="#fff">
                  <tspan>{item.label.length > w / 7 ? `${item.label.slice(0, Math.floor(w / 7))}…` : item.label}</tspan>
                  <tspan x={6} dy={16} fontWeight={700}>{(item.share * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</tspan>
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {hover && (
        <Tooltip x={hover.x} y={hover.y}>
          <strong>{hover.item.label}</strong>
          {hover.item.tooltip.map((line) => <div key={line}>{line}</div>)}
        </Tooltip>
      )}
    </div>
  )
}