import { useEffect, useMemo, useRef, useState } from 'react'
import { geoNaturalEarth1, geoPath, select, zoom, type ZoomBehavior } from 'd3'
import type { CountryFeature } from '../lib/geo'

const WIDTH = 960
const HEIGHT = 500

interface Props {
  features: CountryFeature[]
  fillFor: (iso3: string) => string            // color of each country
  isActive: (iso3: string) => boolean          // false = dimmed by the filters
  tooltipFor: (iso3: string) => string | null  // text shown on hover
  selected: string | null
  onSelect: (iso3: string) => void
}

export default function WorldMap({ features, fillFor, isActive, tooltipFor, selected, onSelect }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [hover, setHover] = useState<{ iso3: string; x: number; y: number } | null>(null)

  // 1. Turn each country shape into an SVG path string (only when the shapes change)
  const paths = useMemo(() => {
    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], { type: 'FeatureCollection', features })
    const path = geoPath(projection)
    return features.map((f) => ({ iso3: f.properties.iso3, d: path(f) ?? '' }))
  }, [features])

  // 2. Zoom and pan: D3 listens to the mouse/trackpad and moves the <g> group
  useEffect(() => {
    if (!svgRef.current) return
    const svg = select(svgRef.current)
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [WIDTH, HEIGHT]])
      .on('zoom', (event) => gRef.current?.setAttribute('transform', event.transform.toString()))
    svg.call(behavior)
    zoomRef.current = behavior
    return () => { svg.on('.zoom', null) }
  }, [])

  const zoomBy = (factor: number) => {
    if (svgRef.current && zoomRef.current) {
      select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, factor)
    }
  }

  const selectedPath = paths.find((p) => p.iso3 === selected)
  const tooltip = hover ? tooltipFor(hover.iso3) : null

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: '100%', height: 'auto', display: 'block', background: 'var(--map-water)' }}
        onMouseLeave={() => setHover(null)}
      >
        <g ref={gRef}>
          {paths.map((p, index) => (
            <path
              key={`${p.iso3}-${index}`}
              d={p.d}
              vectorEffect="non-scaling-stroke"
              style={{
                fill: fillFor(p.iso3),
                opacity: isActive(p.iso3) ? 1 : 0.25,
                stroke: 'var(--map-border)',
                strokeWidth: 0.5,
                cursor: 'pointer',
              }}
              onMouseMove={(e) => {
                const box = svgRef.current!.getBoundingClientRect()
                setHover({ iso3: p.iso3, x: e.clientX - box.left, y: e.clientY - box.top })
              }}
              onClick={() => onSelect(p.iso3)}
            />
          ))}
          {/* Drawn last so the outline of the selected country sits on top of its neighbours */}
          {selectedPath && (
            <path
              d={selectedPath.d}
              vectorEffect="non-scaling-stroke"
              style={{ fill: 'none', stroke: 'var(--map-selected-stroke)', strokeWidth: 1.5, pointerEvents: 'none' }}
            />
          )}
        </g>
      </svg>

      <div style={{ position: 'absolute', top: 'var(--space-sm)', left: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
        <button aria-label="Aproximar" onClick={() => zoomBy(1.5)}>+</button>
        <button aria-label="Afastar" onClick={() => zoomBy(1 / 1.5)}>−</button>
      </div>

      {hover && tooltip && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            left: hover.x + 12,
            top: hover.y + 12,
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            padding: 'var(--space-xs) var(--space-sm)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  )
}