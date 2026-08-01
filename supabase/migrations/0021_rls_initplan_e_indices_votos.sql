-- The dashboard showed 0 votes and empty Top Municípios/Bairros/Zonas: every
-- aggregation query was dying with "canceling statement due to statement
-- timeout" (57014) against the authenticated role's 8s ceiling. The same
-- views run in 10-24ms as postgres, so the cost was not the SQL -- it was RLS.
--
-- Every policy tested `is_super_admin()` bare. Postgres treats an unwrapped
-- function call in a policy qual as a per-row filter, so the function (which
-- itself selects from profiles) was re-executed for each of the ~12k votos
-- and ~9k secoes rows the views scan. Wrapping it in a scalar subquery lets
-- the planner hoist it into an InitPlan and evaluate it exactly once per
-- query. Semantics are identical -- the function is STABLE and takes no
-- per-row arguments.
--
-- Also adds the covering indexes for votos' four territorial foreign keys.
-- The aggregation views join and group on these columns, and they were doing
-- sequential scans; flagged by the Supabase performance advisor.

do $$
declare
  r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and (qual like '%is_super_admin()%' or with_check like '%is_super_admin()%')
      and qual not like '%( SELECT is_super_admin()%'
  loop
    execute format(
      'alter policy %I on public.%I using ((select public.is_super_admin())) with check ((select public.is_super_admin()))',
      r.policyname, r.tablename
    );
  end loop;
end $$;

create index if not exists idx_votos_municipio_id on votos (municipio_id);
create index if not exists idx_votos_bairro_id on votos (bairro_id);
create index if not exists idx_votos_zona_id on votos (zona_id);
create index if not exists idx_votos_secao_id on votos (secao_id);

analyze votos;
analyze secoes;
