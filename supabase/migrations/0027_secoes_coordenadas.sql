-- Seções need their own coordinates so the map can drill down past bairro to
-- the actual polling place -- the level that decides where people are sent on
-- election day.
--
-- These are NOT geocoded. Mapbox has no index of Brazilian schools: probing 10
-- Fortaleza polling places by name returned the city centroid 4 times and
-- matched a similarly-named street or neighbourhood 5 times (e.g. "ESCOLA
-- MUNICIPAL PRESIDENTE KENNEDY", in Jóquei Clube, resolved to the Presidente
-- Kennedy *neighbourhood*). Those answers land inside the city with plausible
-- feature types, so no bbox or type guard rejects them.
--
-- The coordinates come instead from TSE's own polling-place register
-- (eleitorado_local_votacao), which carries NR_LATITUDE/NR_LONGITUDE and
-- covers 99.5% of Ceará's seções.
alter table secoes add column if not exists latitude double precision;
alter table secoes add column if not exists longitude double precision;

comment on column secoes.latitude is
  'Origem: TSE (eleitorado_local_votacao), não geocodificado. Ver 0027.';
comment on column secoes.longitude is
  'Origem: TSE (eleitorado_local_votacao), não geocodificado. Ver 0027.';

create index if not exists idx_secoes_coordenadas
  on secoes (latitude, longitude)
  where latitude is not null and longitude is not null;
