-- Rebuilds the zona views for the estado-level zona (0024). Same
-- finest-grain-wins rule as the other levels: prefer detail recorded inside
-- the zona (its seções) over a total recorded at the zona itself, never sum
-- both. A zona no longer has a single município, so it exposes estado_id and
-- lets callers derive the municípios it spans from its seções.
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
  z.estado_id,
  coalesce(ds.campanha_id, dz.campanha_id) as campanha_id,
  coalesce(ds.total, dz.total) as total_votos
from de_secao ds
full outer join de_zona dz
  on dz.zona_id = ds.zona_id and dz.campanha_id = ds.campanha_id
join zonas z on z.id = coalesce(ds.zona_id, dz.zona_id);

create view vw_ranking_zona with (security_invoker = true) as
select
  zona_id,
  campanha_id,
  total_votos,
  rank() over (partition by campanha_id order by total_votos desc) as ranking
from vw_votos_zona;
