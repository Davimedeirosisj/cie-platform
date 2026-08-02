-- Analysis that recomputes itself from whatever data is loaded, so every new
-- import updates the reading instead of leaving a hand-written conclusion
-- stale on the dashboard.
--
-- Two shapes:
--   fn_analise_campanha  -- one row describing how a campaign's vote is spread
--   fn_analise_retencao  -- how well each bairro held its vote between two
--
-- Both are STABLE and read only through the finest-grain-wins views, so they
-- agree with the KPIs and rankings rather than double counting.

create or replace function fn_analise_campanha(p_campanha_id uuid)
returns table (
  total_votos bigint,
  secoes_com_voto int,
  media_por_secao numeric,
  maior_secao int,
  secoes_para_50pct int,
  secoes_10_ou_mais int,
  municipios_com_voto int,
  municipios_para_80pct int,
  top_municipio text,
  top_municipio_pct numeric
)
language sql stable security invoker set search_path = public as $$
  with sec as (
    select v.secao_id, v.quantidade_votos as q
    from votos v
    where v.campanha_id = p_campanha_id and v.nivel = 'secao' and v.quantidade_votos > 0
  ),
  sec_rank as (
    select q,
           sum(q) over (order by q desc, secao_id) as acum,
           sum(q) over () as tot,
           row_number() over (order by q desc, secao_id) as pos
    from sec
  ),
  mun as (
    select m.nome, vm.total_votos as q
    from vw_votos_municipio vm
    join municipios m on m.id = vm.municipio_id
    where vm.campanha_id = p_campanha_id and vm.total_votos > 0
  ),
  mun_rank as (
    select nome, q,
           sum(q) over (order by q desc, nome) as acum,
           sum(q) over () as tot,
           row_number() over (order by q desc, nome) as pos
    from mun
  )
  select
    coalesce((select sum(q)::bigint from mun), 0),
    (select count(*)::int from sec),
    (select round(avg(q), 1) from sec),
    (select coalesce(max(q), 0)::int from sec),
    (select coalesce(min(pos), 0)::int from sec_rank where acum >= tot * 0.5),
    (select count(*)::int from sec where q >= 10),
    (select count(*)::int from mun),
    (select coalesce(min(pos), 0)::int from mun_rank where acum >= tot * 0.8),
    (select nome from mun_rank where pos = 1),
    (select round(q::numeric / nullif(tot, 0) * 100, 1) from mun_rank where pos = 1);
$$;

comment on function fn_analise_campanha is
  'Resumo de dispersão e concentração de uma campanha. Recalculado a cada consulta.';

-- p_municipio_id restricts the comparison to one município, which is what
-- makes a bairro ranking meaningful: bairros of different cities never
-- contested the same race.
create or replace function fn_analise_retencao(
  p_campanha_base uuid,
  p_campanha_recente uuid,
  p_municipio_id uuid default null
)
returns table (
  bairro_id uuid,
  nome text,
  votos_base bigint,
  votos_recente bigint,
  retencao_pct numeric
)
language sql stable security invoker set search_path = public as $$
  with base as (
    select vb.bairro_id, vb.total_votos as q
    from vw_votos_bairro vb
    join bairros b on b.id = vb.bairro_id
    where vb.campanha_id = p_campanha_base
      and vb.total_votos > 0
      and (p_municipio_id is null or b.municipio_id = p_municipio_id)
  ),
  recente as (
    select vb.bairro_id, vb.total_votos as q
    from vw_votos_bairro vb
    where vb.campanha_id = p_campanha_recente
  )
  select
    base.bairro_id,
    b.nome::text,
    base.q::bigint,
    coalesce(recente.q, 0)::bigint,
    round(coalesce(recente.q, 0)::numeric / base.q * 100, 1)
  from base
  join bairros b on b.id = base.bairro_id
  left join recente on recente.bairro_id = base.bairro_id
  order by round(coalesce(recente.q, 0)::numeric / base.q * 100, 1) desc;
$$;

comment on function fn_analise_retencao is
  'Quanto cada bairro manteve da votação entre duas campanhas. Ver 0028.';
