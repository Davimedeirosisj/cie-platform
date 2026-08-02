-- Integrity checks, runnable on demand and after every import.
--
-- Each of these corresponds to a bug that actually shipped and cost hours to
-- find, so the suite is a record of what has gone wrong before:
--
--   * aggregation views disagreeing across dimensions (0014-0018, 0024)
--   * a zona number split across rows (0017, then again in 0024)
--   * SQL functions still naming dropped tables, which only fail when called
--     (fn_comparar_campanhas and fn_busca_global both did)
--   * a batch left at 'processando' after a statement timeout (0020)
--   * coordinates landing outside the state (the geocoding false positives)
--
-- Returns one row per check so a caller can show them all rather than
-- stopping at the first failure.
create or replace function fn_verificar_integridade()
returns table (verificacao text, situacao text, detalhe text)
language plpgsql stable security invoker set search_path = public as $$
declare
  r record;
  v_erro text;
begin
  -- The whole point of finest-grain-wins: every dimension must total the same.
  for r in
    select c.nome,
           coalesce((select sum(total_votos) from vw_votos_municipio where campanha_id = c.id), 0) as por_municipio,
           coalesce((select sum(total_votos) from vw_votos_bairro where campanha_id = c.id), 0) as por_bairro,
           coalesce((select sum(total_votos) from vw_votos_zona where campanha_id = c.id), 0) as por_zona
    from campanhas c
  loop
    -- Bairro can legitimately trail: votes recorded only at município level
    -- belong to no bairro. Zona must match município exactly.
    if r.por_municipio <> r.por_zona then
      verificacao := 'totais por dimensao';
      situacao := 'FALHA';
      detalhe := format('%s: municipio=%s, zona=%s (deveriam ser iguais)',
                        r.nome, r.por_municipio, r.por_zona);
      return next;
    elsif r.por_bairro > r.por_municipio then
      verificacao := 'totais por dimensao';
      situacao := 'FALHA';
      detalhe := format('%s: bairro=%s maior que municipio=%s',
                        r.nome, r.por_bairro, r.por_municipio);
      return next;
    end if;
  end loop;
  if not found then null; end if;
  verificacao := 'totais por dimensao';
  situacao := 'OK';
  detalhe := 'municipio, bairro e zona consistentes em todas as campanhas';
  return next;

  -- A zona number must be one row per estado. It was split per bairro, then
  -- per município; both fragmented the rankings.
  select count(*) into strict v_erro
  from (select estado_id, numero_zona from zonas group by estado_id, numero_zona having count(*) > 1) d;
  verificacao := 'zonas unicas por estado';
  situacao := case when v_erro::int = 0 then 'OK' else 'FALHA' end;
  detalhe := format('%s numero(s) de zona repetido(s)', v_erro);
  return next;

  -- Orphans break the roll-up silently.
  select count(*) into strict v_erro from secoes where zona_id is null;
  verificacao := 'secoes com zona';
  situacao := case when v_erro::int = 0 then 'OK' else 'FALHA' end;
  detalhe := format('%s secao(oes) sem zona', v_erro);
  return next;

  select count(*) into strict v_erro from secoes where bairro_id is null;
  verificacao := 'secoes com bairro';
  situacao := case when v_erro::int = 0 then 'OK' else 'ATENCAO' end;
  detalhe := format('%s secao(oes) sem bairro (nao entram no total por bairro)', v_erro);
  return next;

  -- A timed-out import leaves the batch here and the votes rolled back.
  select count(*) into strict v_erro
  from import_batches
  where status = 'processando' and created_at < now() - interval '10 minutes';
  verificacao := 'importacoes travadas';
  situacao := case when v_erro::int = 0 then 'OK' else 'FALHA' end;
  detalhe := format('%s lote(s) parado(s) em processando ha mais de 10 min', v_erro);
  return next;

  -- Geocoding false positives land inside plausible-looking bounding boxes;
  -- anything outside the state is unambiguously wrong.
  select count(*) into strict v_erro
  from (
    select latitude, longitude from municipios where latitude is not null
    union all select latitude, longitude from bairros where latitude is not null
    union all select latitude, longitude from secoes where latitude is not null
  ) p
  where latitude not between -8.0 and -2.6 or longitude not between -41.6 and -37.1;
  verificacao := 'coordenadas dentro do Ceara';
  situacao := case when v_erro::int = 0 then 'OK' else 'FALHA' end;
  detalhe := format('%s ponto(s) fora do estado', v_erro);
  return next;

  -- Functions resolve table names at call time, so a dropped table only
  -- surfaces when something invokes them. Call each one.
  begin
    perform * from fn_busca_global('a') limit 1;
    verificacao := 'fn_busca_global responde';
    situacao := 'OK';
    detalhe := 'consulta executada';
  exception when others then
    verificacao := 'fn_busca_global responde';
    situacao := 'FALHA';
    detalhe := sqlerrm;
  end;
  return next;

  begin
    perform * from fn_comparar_campanhas(
      'municipio',
      (select id from campanhas order by ano limit 1),
      (select id from campanhas order by ano desc limit 1)
    ) limit 1;
    verificacao := 'fn_comparar_campanhas responde';
    situacao := 'OK';
    detalhe := 'consulta executada';
  exception when others then
    verificacao := 'fn_comparar_campanhas responde';
    situacao := 'FALHA';
    detalhe := sqlerrm;
  end;
  return next;

  begin
    perform * from fn_analise_campanha((select id from campanhas order by ano limit 1));
    verificacao := 'fn_analise_campanha responde';
    situacao := 'OK';
    detalhe := 'consulta executada';
  exception when others then
    verificacao := 'fn_analise_campanha responde';
    situacao := 'FALHA';
    detalhe := sqlerrm;
  end;
  return next;

  -- RLS policies calling a function unwrapped make it a per-row filter, which
  -- pushed the dashboard past the 8s statement timeout.
  select count(*) into strict v_erro
  from pg_policies
  where schemaname = 'public'
    and qual like '%is_super_admin()%'
    and qual not like '%( SELECT is_super_admin()%';
  verificacao := 'RLS avaliada uma vez por consulta';
  situacao := case when v_erro::int = 0 then 'OK' else 'FALHA' end;
  detalhe := format('%s policy(ies) chamando is_super_admin() sem subquery', v_erro);
  return next;
end $$;

comment on function fn_verificar_integridade is
  'Checagens de integridade. Rode apos cada importacao. Ver 0029.';
