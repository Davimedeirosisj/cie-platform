// Ceará is the only estado seeded in v1.0 -- centers the map on it by default.
// The drill-down runs Município -> Bairro -> Seção. Seção coordinates come
// from TSE's polling-place register rather than a geocoder (see 0027), so the
// deepest level points at real buildings.
export const MAP_DEFAULT_CENTER: [number, number] = [-39.6, -5.2]; // Ceará centroid, approx.
export const MAP_DEFAULT_ZOOM = 6;
export const MAP_MUNICIPIO_ZOOM = 11;
// Bairro-level view: close enough to tell neighbouring polling places apart.
export const MAP_BAIRRO_ZOOM = 14;
// A single polling place -- street level.
export const MAP_SECAO_ZOOM = 16;

export function hasMapboxToken(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
}
