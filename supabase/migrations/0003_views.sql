-- Centro de Inteligência Eleitoral (CIE)
-- 0003: vote-aggregation views, ranking views, campaign comparison and
--       global search functions.

-- ============ Vote aggregation (rolled up from votos_secao) ============
-- security_invoker so these views enforce RLS as the calling user, not the
-- (superuser-ish) view owner -- required for future non-super_admin roles.
create view vw_votos_zona with (security_invoker = true) as
select z.id as zona_id, z.bairro_id, vs.campanha_id, sum(vs.quantidade_votos) as total_votos
from zonas z
join secoes s on s.zona_id = z.id
join votos_secao vs on vs.secao_id = s.id
group by z.id, z.bairro_id, vs.campanha_id;

create view vw_votos_bairro with (security_invoker = true) as
select b.id as bairro_id, b.municipio_id, vs.campanha_id, sum(vs.quantidade_votos) as total_votos
from bairros b
join zonas z on z.bairro_id = b.id
join secoes s on s.zona_id = z.id
join votos_secao vs on vs.secao_id = s.id
group by b.id, b.municipio_id, vs.campanha_id;

create view vw_votos_municipio with (security_invoker = true) as
select m.id as municipio_id, m.estado_id, vs.campanha_id, sum(vs.quantidade_votos) as total_votos
from municipios m
join bairros b on b.municipio_id = m.id
join zonas z on z.bairro_id = b.id
join secoes s on s.zona_id = z.id
join votos_secao vs on vs.secao_id = s.id
group by m.id, m.estado_id, vs.campanha_id;

-- ============ Rankings (per level, per campanha) ============
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

create view vw_ranking_secao with (security_invoker = true) as
select vs.secao_id, vs.campanha_id, vs.quantidade_votos as total_votos,
       rank() over (partition by vs.campanha_id order by vs.quantidade_votos desc) as ranking
from votos_secao vs;

-- ============ Campaign comparison (growth/decline) ============
create or replace function fn_comparar_campanhas(
  p_nivel meta_nivel, p_campanha_a uuid, p_campanha_b uuid
) returns table (
  territorio_id uuid, votos_a numeric, votos_b numeric,
  variacao_absoluta numeric, variacao_percentual numeric
) language sql stable as $$
  select coalesce(a.id_col, b.id_col) as territorio_id,
         coalesce(a.total_votos, 0) as votos_a,
         coalesce(b.total_votos, 0) as votos_b,
         coalesce(b.total_votos, 0) - coalesce(a.total_votos, 0) as variacao_absoluta,
         case when coalesce(a.total_votos, 0) = 0 then null
              else round((coalesce(b.total_votos, 0) - a.total_votos)::numeric / a.total_votos * 100, 2)
         end as variacao_percentual
  from (
    select municipio_id as id_col, total_votos from vw_votos_municipio where campanha_id = p_campanha_a and p_nivel = 'municipio'
    union all select bairro_id, total_votos from vw_votos_bairro where campanha_id = p_campanha_a and p_nivel = 'bairro'
    union all select zona_id, total_votos from vw_votos_zona where campanha_id = p_campanha_a and p_nivel = 'zona'
    union all select secao_id, quantidade_votos from votos_secao where campanha_id = p_campanha_a and p_nivel = 'secao'
  ) a
  full outer join (
    select municipio_id as id_col, total_votos from vw_votos_municipio where campanha_id = p_campanha_b and p_nivel = 'municipio'
    union all select bairro_id, total_votos from vw_votos_bairro where campanha_id = p_campanha_b and p_nivel = 'bairro'
    union all select zona_id, total_votos from vw_votos_zona where campanha_id = p_campanha_b and p_nivel = 'zona'
    union all select secao_id, quantidade_votos from votos_secao where campanha_id = p_campanha_b and p_nivel = 'secao'
  ) b on a.id_col = b.id_col;
$$;

-- ============ Global search across the 4 territorial levels ============
create or replace function fn_busca_global(p_termo text)
returns table (
  nivel meta_nivel, id uuid, titulo text, subtitulo text
) language sql stable as $$
  select 'municipio'::meta_nivel, m.id, m.nome::text, e.nome::text
  from municipios m join estados e on e.id = m.estado_id
  where m.nome ilike '%' || p_termo || '%'
  union all
  select 'bairro'::meta_nivel, b.id, b.nome::text, m.nome::text
  from bairros b join municipios m on m.id = b.municipio_id
  where b.nome ilike '%' || p_termo || '%'
  union all
  select 'zona'::meta_nivel, z.id, ('Zona ' || z.numero_zona)::text, b.nome::text
  from zonas z join bairros b on b.id = z.bairro_id
  where z.numero_zona::text ilike '%' || p_termo || '%'
  union all
  select 'secao'::meta_nivel, s.id, ('Seção ' || s.numero_secao)::text, coalesce(s.local_votacao, '')::text
  from secoes s
  where s.numero_secao::text ilike '%' || p_termo || '%'
     or s.local_votacao ilike '%' || p_termo || '%'
  limit 50;
$$;
