-- fn_comparar_campanhas still read from votos_secao, the table dropped in
-- 0014 when votes moved to the polymorphic `votos` table. Postgres resolves
-- table names in a SQL function at call time, so the function kept existing
-- happily and only failed when invoked -- which is why the dashboard's
-- comparison panel showed a permanent "Sem dados." instead of an error.
--
-- The seção branch now reads `votos` at nivel = 'secao'. The other three
-- levels keep using the finest-grain-wins views (0018), so a município
-- compared here matches what the KPI cards and rankings report.
create or replace function fn_comparar_campanhas(
  p_nivel meta_nivel,
  p_campanha_a uuid,
  p_campanha_b uuid
-- Return types stay numeric to match the existing signature: changing them
-- would require dropping the function, and nothing here needs a wider type.
) returns table (
  territorio_id uuid,
  votos_a numeric,
  votos_b numeric,
  variacao_absoluta numeric,
  variacao_percentual numeric
)
language sql stable security invoker set search_path = public as $$
  select coalesce(a.id_col, b.id_col) as territorio_id,
         coalesce(a.total_votos, 0) as votos_a,
         coalesce(b.total_votos, 0) as votos_b,
         coalesce(b.total_votos, 0) - coalesce(a.total_votos, 0) as variacao_absoluta,
         case when coalesce(a.total_votos, 0) = 0 then null
              else round((coalesce(b.total_votos, 0) - a.total_votos)::numeric / a.total_votos * 100, 2)
         end as variacao_percentual
  from (
    select municipio_id as id_col, total_votos::numeric as total_votos from vw_votos_municipio where campanha_id = p_campanha_a and p_nivel = 'municipio'
    union all select bairro_id, total_votos::numeric from vw_votos_bairro where campanha_id = p_campanha_a and p_nivel = 'bairro'
    union all select zona_id, total_votos::numeric from vw_votos_zona where campanha_id = p_campanha_a and p_nivel = 'zona'
    union all select secao_id, quantidade_votos::numeric from votos where campanha_id = p_campanha_a and nivel = 'secao' and p_nivel = 'secao'
  ) a
  full outer join (
    select municipio_id as id_col, total_votos::numeric as total_votos from vw_votos_municipio where campanha_id = p_campanha_b and p_nivel = 'municipio'
    union all select bairro_id, total_votos::numeric from vw_votos_bairro where campanha_id = p_campanha_b and p_nivel = 'bairro'
    union all select zona_id, total_votos::numeric from vw_votos_zona where campanha_id = p_campanha_b and p_nivel = 'zona'
    union all select secao_id, quantidade_votos::numeric from votos where campanha_id = p_campanha_b and nivel = 'secao' and p_nivel = 'secao'
  ) b on a.id_col = b.id_col;
$$;
