import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { geoGraticule10, geoNaturalEarth1, geoPath, select, zoom, zoomIdentity, type ZoomBehavior } from 'd3'
import type { CountryFeature } from '../lib/geo'
import './WorldMap.css'

const WIDTH = 960
const HEIGHT = 500

interface Props {
  features: CountryFeature[]
  fillFor: (iso3: string) => string              // color of each country
  isActive: (iso3: string) => boolean            // false = dimmed by the filters
  tooltipFor: (iso3: string) => ReactNode | null // content shown on hover (text or JSX)
  selected: string | null
  onSelect: (iso3: string) => void
  globe?: boolean                                // draw the oval outline and grid lines (world map only)
}

export default function WorldMap({ features, fillFor, isActive, tooltipFor, selected, onSelect, globe = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [hover, setHover] = useState<{ iso3: string; x: number; y: number; flip: boolean } | null>(null)

  // 1. Turn each shape into an SVG path string (only when the shapes change).
  //    For the globe we fit the whole sphere, so the oval is never cut off.
  const { paths, sphere, graticule } = useMemo(() => {
    const projection = geoNaturalEarth1()
    if (globe) projection.fitExtent([[4, 4], [WIDTH - 4, HEIGHT - 4]], { type: 'Sphere' })
    else projection.fitSize([WIDTH, HEIGHT], { type: 'FeatureCollection', features })
    const path = geoPath(projection)
    return {
      paths: features.map((f) => ({ iso3: f.properties.iso3, d: path(f) ?? '' })),
      sphere: globe ? path({ type: 'Sphere' }) ?? '' : '',
      graticule: globe ? path(geoGraticule10()) ?? '' : '',
    }
  }, [features, globe])

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
  const resetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, zoomIdentity)
    }
  }

  const selectedPath = paths.find((p) => p.iso3 === selected)
  const hoverPath = hover && hover.iso3 !== selected ? paths.find((p) => p.iso3 === hover.iso3) : null
  const tooltip = hover ? tooltipFor(hover.iso3) : null

  return (
    <div className="world-map">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={globe ? 'world-map-svg' : 'world-map-svg with-water'}
        onMouseLeave={() => setHover(null)}
      >
        <g ref={gRef}>
          {globe && <path d={sphere} className="map-sphere" />}
          {globe && <path d={graticule} className="map-graticule" vectorEffect="non-scaling-stroke" />}

          {paths.map((p, index) => (
            <path
              key={`${p.iso3}-${index}`}
              d={p.d}
              className="map-country"
              vectorEffect="non-scaling-stroke"
              style={{ fill: fillFor(p.iso3), opacity: isActive(p.iso3) ? 1 : 0.25 }}
              onMouseMove={(e) => {
                const box = svgRef.current!.getBoundingClientRect()
                const x = e.clientX - box.left
                // Near the right edge the tooltip opens to the left, so it doesn't overflow
                setHover({ iso3: p.iso3, x, y: e.clientY - box.top, flip: x > box.width * 0.65 })
              }}
              onClick={() => onSelect(p.iso3)}
            />
          ))}

          {/* Outlines drawn last, so they sit on top of the neighbours */}
          {hoverPath && <path d={hoverPath.d} className="map-outline-hover" vectorEffect="non-scaling-stroke" />}
          {selectedPath && <path d={selectedPath.d} className="map-outline-selected" vectorEffect="non-scaling-stroke" />}
        </g>
      </svg>

      <div className="map-zoom">
        <button type="button" aria-label="Aproximar" onClick={() => zoomBy(1.5)}>+</button>
        <button type="button" aria-label="Afastar" onClick={() => zoomBy(1 / 1.5)}>−</button>
        <button type="button" aria-label="Voltar ao mapa inteiro" onClick={resetZoom}>↺</button>
      </div>

      {hover && tooltip && (
        <div
          role="tooltip"
          className="map-tip"
          style={{ left: hover.x + 14, top: hover.y + 14, transform: hover.flip ? 'translateX(calc(-100% - 28px))' : undefined }}
        >
          {tooltip}
        </div>
      )}
    </div>
  )
}
