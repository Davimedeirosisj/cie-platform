// Bahia is the only estado seeded in v1.0 -- centers the map on it by
// default. Município/Bairro only (zonas/seções have no lat/long columns
// in the v1.0 schema), so the map drill-down stops at Bairro level.
export const MAP_DEFAULT_CENTER: [number, number] = [-41.7, -12.5]; // Bahia centroid, approx.
export const MAP_DEFAULT_ZOOM = 6;
export const MAP_MUNICIPIO_ZOOM = 11;

export function hasMapboxToken(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
}
