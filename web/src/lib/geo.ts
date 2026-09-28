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


// Any TopoJSON layer -> shapes keyed by one of its properties.
// The key goes into `iso3` so WorldMap can draw it (for Brazil it holds the state code, e.g. "SP").
// This is where designing WorldMap to be data-agnostic in Phase 5 pays off. The same component draws the Brazil states map, with no changes. It auto-fits the projection to whatever shapes it receives.
export function toFeaturesBy(topo: Topology, object: string, idProp: string): CountryFeature[] {
  const layer = topo.objects[object] as GeometryCollection<Record<string, string>>
  const collection = feature(topo, layer) as FeatureCollection<Geometry, Record<string, string>>
  return collection.features.map((f) => ({ ...f, properties: { iso3: f.properties[idProp] } }))
}