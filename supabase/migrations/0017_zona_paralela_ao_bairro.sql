-- Centro de Inteligência Eleitoral (CIE)
-- 0017: zona eleitoral belongs to the município, not to a bairro.
--
-- WHY: the PRD lists the hierarchy as Estado > Município > Bairro > Zona >
-- Seção, and 0001 modelled it literally -- zonas.bairro_id, unique on
-- (bairro_id, numero_zona). Electorally that is wrong: a zona spans many
-- bairros. With real Fortaleza data the table held 130 rows for 17 actual
-- zonas (zona 113 appeared 13 times, once per bairro it touches), so ranking
-- by zona showed "Zona 113 = 27" instead of its true 160, and a meta set on
-- a zona only ever covered one bairro's slice of it.
--
-- Correct shape: bairro and zona are two PARALLEL groupings of the same
-- seções. A seção sits inside exactly one zona and one bairro, so both
-- dimensions roll up from it independently.
--
--   município ─┬─ bairro ─┐
--              └─ zona ───┴─ seção   (seção carries both FKs)

-- ============ 1. New columns ============
alter table zonas add column municipio_id uuid references municipios(id) on delete restrict;
alter table secoes add column bairro_id uuid references bairros(id) on delete restrict;

-- Point each existing zona at the município of the bairro it hung off, and
-- record each seção's bairro (currently reachable only via its zona).
update zonas z
set municipio_id = b.municipio_id
from bairros b
where b.id = z.bairro_id;

update secoes s
set bairro_id = z.bairro_id
from zonas z
where z.id = s.zona_id;

-- ============ 2. Collapse duplicated zonas ============
-- Keep the oldest row per (município, numero_zona) and repoint every seção of
-- the duplicates at it; the seções keep their own bairro_id, so no territorial
-- information is lost by the merge.
with canonica as (
  select distinct on (municipio_id, numero_zona)
         id, municipio_id, numero_zona
  from zonas
  order by municipio_id, numero_zona, created_at, id
)
update secoes s
set zona_id = c.id
from zonas z
join canonica c
  on c.municipio_id = z.municipio_id and c.numero_zona = z.numero_zona
where z.id = s.zona_id and c.id <> z.id;

-- Votes recorded directly at zona level must follow the same merge.
with canonica as (
  select distinct on (municipio_id, numero_zona)
         id, municipio_id, numero_zona
  from zonas
  order by municipio_id, numero_zona, created_at, id
)
update votos v
set zona_id = c.id
from zonas z
join canonica c
  on c.municipio_id = z.municipio_id and c.numero_zona = z.numero_zona
where z.id = v.zona_id and c.id <> z.id;

with canonica as (
  select distinct on (municipio_id, numero_zona)
         id, municipio_id, numero_zona
  from zonas
  order by municipio_id, numero_zona, created_at, id
)
update metas m
set zona_id = c.id
from zonas z
join canonica c
  on c.municipio_id = z.municipio_id and c.numero_zona = z.numero_zona
where z.id = m.zona_id and c.id <> z.id;

delete from zonas z
where exists (
  select 1 from zonas outra
  where outra.municipio_id = z.municipio_id
    and outra.numero_zona = z.numero_zona
    and outra.id <> z.id
    and (outra.created_at, outra.id) < (z.created_at, z.id)
);

-- ============ 3. Swap the parent ============
alter table zonas alter column municipio_id set not null;
alter table secoes alter column bairro_id set not null;

drop index if exists zonas_bairro_id_idx;
drop index if exists idx_zonas_bairro_numero;
alter table zonas drop constraint zonas_bairro_id_numero_zona_key;
-- The aggregation views read zonas.bairro_id; they are rebuilt in 0018 for
-- the parallel dimensions, so drop them before removing the column.
drop view if exists vw_ranking_municipio;
drop view if exists vw_ranking_bairro;
drop view if exists vw_ranking_zona;
drop view if exists vw_votos_municipio;
drop view if exists vw_votos_bairro;
drop view if exists vw_votos_zona;
alter table zonas drop column bairro_id;

alter table zonas add constraint zonas_municipio_numero_key unique (municipio_id, numero_zona);
create index zonas_municipio_id_idx on zonas (municipio_id);
create index secoes_bairro_id_idx on secoes (bairro_id);
