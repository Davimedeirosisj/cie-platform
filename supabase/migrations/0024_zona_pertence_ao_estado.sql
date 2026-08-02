-- Zona eleitoral belongs to the estado, not to a município.
--
-- TSE numbers zonas uniquely per UF, and one zona serves several municípios
-- in the interior: Zona 5 covers Baturité, Guaramiranga, Mulungu and Pacoti;
-- Zona 24 covers Sobral, Meruoca and Alcântaras. Hanging zona off município
-- (0017) split each real zona into one row per município it touches -- 187
-- rows for 109 actual zonas -- so zona rankings were fragmented, with Zona 5's
-- 116 votes showing up as four rows of roughly 29.
--
-- This is the same mistake 0017 fixed one level down (zona under bairro),
-- repeated one level up. The território shape is now:
--
--   Estado ─┬─ Município ── Bairro ─┐
--           └─ Zona ────────────────┴─ Seção   (seção carries both FKs)
--
-- Safe to merge here: no metas target a zona and no votes are recorded at
-- zona level, so only secoes.zona_id needs repointing. The vote total for a
-- zona is derived from its seções either way.

alter table zonas add column if not exists estado_id uuid references estados(id) on delete cascade;

update zonas z
set estado_id = m.estado_id
from municipios m
where m.id = z.municipio_id and z.estado_id is null;

-- Point every seção at the surviving zona for its number (oldest row wins,
-- matching how 0017 picked a survivor).
with sobrevivente as (
  select distinct on (estado_id, numero_zona)
         id, estado_id, numero_zona
  from zonas
  order by estado_id, numero_zona, created_at, id
)
update secoes s
set zona_id = sob.id
from zonas z
join sobrevivente sob
  on sob.estado_id = z.estado_id and sob.numero_zona = z.numero_zona
where s.zona_id = z.id and s.zona_id <> sob.id;

-- Same for the polymorphic tables, in case either gains rows before this runs.
with sobrevivente as (
  select distinct on (estado_id, numero_zona) id, estado_id, numero_zona
  from zonas order by estado_id, numero_zona, created_at, id
)
update votos v
set zona_id = sob.id
from zonas z
join sobrevivente sob on sob.estado_id = z.estado_id and sob.numero_zona = z.numero_zona
where v.zona_id = z.id and v.zona_id <> sob.id;

with sobrevivente as (
  select distinct on (estado_id, numero_zona) id, estado_id, numero_zona
  from zonas order by estado_id, numero_zona, created_at, id
)
update metas mt
set zona_id = sob.id
from zonas z
join sobrevivente sob on sob.estado_id = z.estado_id and sob.numero_zona = z.numero_zona
where mt.zona_id = z.id and mt.zona_id <> sob.id;

delete from zonas z
where exists (
  select 1 from zonas outra
  where outra.estado_id = z.estado_id
    and outra.numero_zona = z.numero_zona
    and (outra.created_at, outra.id) < (z.created_at, z.id)
);

-- Views depend on zonas.municipio_id; rebuilt in 0025.
drop view if exists vw_ranking_zona cascade;
drop view if exists vw_votos_zona cascade;

alter table zonas drop constraint if exists zonas_municipio_id_numero_zona_key;
alter table zonas drop column if exists municipio_id;

alter table zonas alter column estado_id set not null;
alter table zonas add constraint zonas_estado_numero_key unique (estado_id, numero_zona);

create index if not exists idx_zonas_estado_id on zonas (estado_id);
