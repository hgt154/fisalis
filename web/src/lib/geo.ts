import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Feature, FeatureCollection, Geometry } from 'geojson'

export interface CountryProps {
  iso3: string
}

export type CountryFeature = Feature<Geometry, CountryProps>

// world.topo.json (compact TopoJSON) -> list of GeoJSON country shapes D3 can draw
export function toFeatures(topo: Topology): CountryFeature[] {
  const countries = topo.objects.countries as GeometryCollection<CountryProps>
  const collection = feature(topo, countries) as FeatureCollection<Geometry, CountryProps>
  return collection.features
}