-- Centro de Inteligência Eleitoral (CIE)
-- 0018: aggregation views for the parallel bairro/zona dimensions (0017).
--
-- Bairro and zona are now two independent groupings of the same seções, so
-- each rolls up from secoes via its own FK instead of through the other.
-- "Finest grain wins" (0015) is preserved: a território prefers the detail
-- inside it and falls back to a total recorded at its own level.

drop view if exists vw_ranking_municipio;
drop view if exists vw_ranking_bairro;
drop view if exists vw_ranking_zona;
drop view if exists vw_votos_municipio;
drop view if exists vw_votos_bairro;
drop view if exists vw_votos_zona;

-- Zona: sum of its seções, else a total recorded on the zona itself.
create view vw_votos_zona with (security_invoker = true) as
with de_secao as (
  select s.zona_id, v.campanha_id, sum(v.quantidade_votos) as total
  from votos v
  join secoes s on s.id = v.secao_id
  where v.nivel = 'secao'
  group by s.zona_id, v.campanha_id
),
de_zona as (
  select v.zona_id, v.campanha_id, sum(v.quantidade_votos) as total
  from votos v
  where v.nivel = 'zona'
  group by v.zona_id, v.campanha_id
)
select
  coalesce(ds.zona_id, dz.zona_id) as zona_id,
  z.municipio_id,
  coalesce(ds.campanha_id, dz.campanha_id) as campanha_id,
  coalesce(ds.total, dz.total) as total_votos
from de_secao ds
full outer join de_zona dz
  on dz.zona_id = ds.zona_id and dz.campanha_id = ds.campanha_id
join zonas z on z.id = coalesce(ds.zona_id, dz.zona_id);

-- Bairro: sum of its seções (via secoes.bairro_id, NOT via zona), else a
-- total recorded on the bairro itself.
create view vw_votos_bairro with (security_invoker = true) as
with de_secao as (
  select s.bairro_id, v.campanha_id, sum(v.quantidade_votos) as total
  from votos v
  join secoes s on s.id = v.secao_id
  where v.nivel = 'secao'
  group by s.bairro_id, v.campanha_id
),
de_bairro as (
  select v.bairro_id, v.campanha_id, sum(v.quantidade_votos) as total
  from votos v
  where v.nivel = 'bairro'
  group by v.bairro_id, v.campanha_id
)
select
  coalesce(ds.bairro_id, db.bairro_id) as bairro_id,
  b.municipio_id,
  coalesce(ds.campanha_id, db.campanha_id) as campanha_id,
  coalesce(ds.total, db.total) as total_votos
from de_secao ds
full outer join de_bairro db
  on db.bairro_id = ds.bairro_id and db.campanha_id = ds.campanha_id
join bairros b on b.id = coalesce(ds.bairro_id, db.bairro_id);

-- Município: rolls up through bairros (the dimension that always exists for
-- a seção), else a total recorded on the município itself. Going through
-- zonas instead would give the same number -- both partition the same seções.
create view vw_votos_municipio with (security_invoker = true) as
with de_bairro as (
  select b.municipio_id, vb.campanha_id, sum(vb.total_votos) as total
  from vw_votos_bairro vb
  join bairros b on b.id = vb.bairro_id
  group by b.municipio_id, vb.campanha_id
),
de_municipio as (
  select v.municipio_id, v.campanha_id, sum(v.quantidade_votos) as total
  from votos v
  where v.nivel = 'municipio'
  group by v.municipio_id, v.campanha_id
)
select
  coalesce(db.municipio_id, dm.municipio_id) as municipio_id,
  m.estado_id,
  coalesce(db.campanha_id, dm.campanha_id) as campanha_id,
  coalesce(db.total, dm.total) as total_votos
from de_bairro db
full outer join de_municipio dm
  on dm.municipio_id = db.municipio_id and dm.campanha_id = db.campanha_id
join municipios m on m.id = coalesce(db.municipio_id, dm.municipio_id);

create view vw_ranking_municipio with (security_invoker = true) as
select v.municipio_id, v.campanha_id, v.total_votos,
       rank() over (partition by v.campanha_id order by v.total_votos desc) as ranking
from vw_votos_municipio v;

create view vw_ranking_bairro with (security_invoker = true) as
select v.bairro_id, v.campanha_id, v.total_votos,
       rank() over (partition by v.campanha_id order by v.total_votos desc) as ranking
from vw_votos_bairro v;

create view vw_ranking_zona with (security_invoker = true) as
select v.zona_id, v.campanha_id, v.total_votos,
       rank() over (partition by v.campanha_id order by v.total_votos desc) as ranking
from vw_votos_zona v;
