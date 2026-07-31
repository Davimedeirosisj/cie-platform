-- Centro de Inteligência Eleitoral (CIE)
-- 0015: aggregate with "finest grain wins", replacing the naive sum in 0014.
--
-- WHY: the same campaign receives several files describing the SAME votes at
-- different granularities -- e.g. one spreadsheet with totals per bairro and
-- another with the detail per zona/seção. Simply summing every row (0014)
-- would count those votes twice. Deleting the coarser rows on import is also
-- wrong: it throws away bairros that only ever appear in the aggregated file.
--
-- Rule implemented here, applied per território and bottom-up:
--   * if any finer-grained data exists inside a território, use that;
--   * otherwise fall back to the total recorded at the território itself.
-- So a bairro covered by the seção file is counted from its seções, while a
-- bairro that appears only in the aggregated file still contributes its total.
-- Both files coexist and every vote is counted exactly once.

drop view if exists vw_ranking_municipio;
drop view if exists vw_ranking_bairro;
drop view if exists vw_ranking_zona;
drop view if exists vw_votos_municipio;
drop view if exists vw_votos_bairro;
drop view if exists vw_votos_zona;

-- Zona: prefer the sum of its seções over a total recorded on the zona.
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
  z.bairro_id,
  coalesce(ds.campanha_id, dz.campanha_id) as campanha_id,
  coalesce(ds.total, dz.total) as total_votos
from de_secao ds
full outer join de_zona dz
  on dz.zona_id = ds.zona_id and dz.campanha_id = ds.campanha_id
join zonas z on z.id = coalesce(ds.zona_id, dz.zona_id);

-- Bairro: prefer the roll-up of its zonas/seções over a total on the bairro.
create view vw_votos_bairro with (security_invoker = true) as
with de_zona as (
  select z.bairro_id, vz.campanha_id, sum(vz.total_votos) as total
  from vw_votos_zona vz
  join zonas z on z.id = vz.zona_id
  group by z.bairro_id, vz.campanha_id
),
de_bairro as (
  select v.bairro_id, v.campanha_id, sum(v.quantidade_votos) as total
  from votos v
  where v.nivel = 'bairro'
  group by v.bairro_id, v.campanha_id
)
select
  coalesce(dz.bairro_id, db.bairro_id) as bairro_id,
  b.municipio_id,
  coalesce(dz.campanha_id, db.campanha_id) as campanha_id,
  coalesce(dz.total, db.total) as total_votos
from de_zona dz
full outer join de_bairro db
  on db.bairro_id = dz.bairro_id and db.campanha_id = dz.campanha_id
join bairros b on b.id = coalesce(dz.bairro_id, db.bairro_id);

-- Município: prefer the roll-up of its bairros over a total on the município.
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
