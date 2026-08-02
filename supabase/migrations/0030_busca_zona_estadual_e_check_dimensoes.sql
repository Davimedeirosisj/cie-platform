-- Two fixes, both found by fn_verificar_integridade on its first run.
--
-- 1. fn_busca_global broke again. 0023 repaired it by joining zonas to
--    municipios via zonas.municipio_id -- and 0024 dropped that column when
--    zona moved up to the estado. A SQL function resolves names at call time,
--    so it stayed valid-looking and failed only when someone searched. That
--    is twice now; the integrity check exists so there is not a third.
--
--    A zona has no single município, so its context is the estado.
--
-- 2. The "totais por dimensao" check was wrong, not the data. It demanded
--    município = zona, but votes recorded at bairro level belong to no zona:
--    NOVO MONDUBIM holds 9 bairro-level votes with no seção detail, so
--    município legitimately reads 9 higher. The real invariant is that zona
--    never exceeds município, and any gap is explained by votes sitting at a
--    level with no zona path.

create or replace function fn_busca_global(p_termo text)
returns table (nivel meta_nivel, id uuid, titulo text, subtitulo text)
language sql stable security invoker set search_path = public as $$
  select 'municipio'::meta_nivel, m.id, m.nome::text, e.nome::text
  from municipios m join estados e on e.id = m.estado_id
  where m.nome ilike '%' || p_termo || '%'
  union all
  select 'bairro'::meta_nivel, b.id, b.nome::text, m.nome::text
  from bairros b join municipios m on m.id = b.municipio_id
  where b.nome ilike '%' || p_termo || '%'
  union all
  select 'zona'::meta_nivel, z.id, ('Zona ' || z.numero_zona)::text, e.nome::text
  from zonas z join estados e on e.id = z.estado_id
  where z.numero_zona::text ilike '%' || p_termo || '%'
  union all
  select 'secao'::meta_nivel, s.id, ('Seção ' || s.numero_secao)::text,
         coalesce(b.nome::text, s.local_votacao, '')::text
  from secoes s left join bairros b on b.id = s.bairro_id
  where s.numero_secao::text ilike '%' || p_termo || '%'
     or s.local_votacao ilike '%' || p_termo || '%'
  limit 50;
$$;

create or replace function fn_verificar_integridade()
returns table (verificacao text, situacao text, detalhe text)
language plpgsql stable security invoker set search_path = public as $$
declare
  r record;
  v_erro bigint;
  v_falhas int := 0;
begin
  for r in
    select c.id, c.nome,
           coalesce((select sum(total_votos) from vw_votos_municipio where campanha_id = c.id), 0) as por_municipio,
           coalesce((select sum(total_votos) from vw_votos_bairro where campanha_id = c.id), 0) as por_bairro,
           coalesce((select sum(total_votos) from vw_votos_zona where campanha_id = c.id), 0) as por_zona,
           -- Votes with no zona to roll up into: recorded at bairro or
           -- município level, for territories with no finer detail.
           coalesce((select sum(v.quantidade_votos) from votos v
                     where v.campanha_id = c.id and v.nivel = 'bairro'
                       and not exists (select 1 from secoes s join votos vs on vs.secao_id = s.id
                                       where s.bairro_id = v.bairro_id and vs.campanha_id = c.id
                                         and vs.nivel = 'secao')), 0) as sem_zona
    from campanhas c
  loop
    if r.por_zona > r.por_municipio then
      v_falhas := v_falhas + 1;
      verificacao := 'totais por dimensao';
      situacao := 'FALHA';
      detalhe := format('%s: zona=%s maior que municipio=%s', r.nome, r.por_zona, r.por_municipio);
      return next;
    elsif r.por_municipio - r.por_zona <> r.sem_zona then
      v_falhas := v_falhas + 1;
      verificacao := 'totais por dimensao';
      situacao := 'FALHA';
      detalhe := format('%s: municipio=%s, zona=%s, diferenca %s nao explicada (votos sem zona: %s)',
                        r.nome, r.por_municipio, r.por_zona, r.por_municipio - r.por_zona, r.sem_zona);
      return next;
    elsif r.sem_zona > 0 then
      verificacao := 'totais por dimensao';
      situacao := 'ATENCAO';
      detalhe := format('%s: municipio=%s, zona=%s. Diferenca de %s vem de votos gravados so por bairro, que nao pertencem a nenhuma zona.',
                        r.nome, r.por_municipio, r.por_zona, r.sem_zona);
      return next;
    end if;
  end loop;
  if v_falhas = 0 then
    verificacao := 'totais por dimensao';
    situacao := 'OK';
    detalhe := 'nenhuma divergencia inexplicada entre municipio, bairro e zona';
    return next;
  end if;

  select count(*) into v_erro
  from (select estado_id, numero_zona from zonas group by estado_id, numero_zona having count(*) > 1) d;
  verificacao := 'zonas unicas por estado';
  situacao := case when v_erro = 0 then 'OK' else 'FALHA' end;
  detalhe := format('%s numero(s) de zona repetido(s)', v_erro);
  return next;

  select count(*) into v_erro from secoes where zona_id is null;
  verificacao := 'secoes com zona';
  situacao := case when v_erro = 0 then 'OK' else 'FALHA' end;
  detalhe := format('%s secao(oes) sem zona', v_erro);
  return next;

  select count(*) into v_erro from secoes where bairro_id is null;
  verificacao := 'secoes com bairro';
  situacao := case when v_erro = 0 then 'OK' else 'ATENCAO' end;
  detalhe := format('%s secao(oes) sem bairro (nao entram no total por bairro)', v_erro);
  return next;

  select count(*) into v_erro
  from import_batches
  where status = 'processando' and created_at < now() - interval '10 minutes';
  verificacao := 'importacoes travadas';
  situacao := case when v_erro = 0 then 'OK' else 'FALHA' end;
  detalhe := format('%s lote(s) parado(s) em processando ha mais de 10 min', v_erro);
  return next;

  select count(*) into v_erro
  from (
    select latitude, longitude from municipios where latitude is not null
    union all select latitude, longitude from bairros where latitude is not null
    union all select latitude, longitude from secoes where latitude is not null
  ) p
  where latitude not between -8.0 and -2.6 or longitude not between -41.6 and -37.1;
  verificacao := 'coordenadas dentro do Ceara';
  situacao := case when v_erro = 0 then 'OK' else 'FALHA' end;
  detalhe := format('%s ponto(s) fora do estado', v_erro);
  return next;

  begin
    perform * from fn_busca_global('a') limit 1;
    verificacao := 'fn_busca_global responde'; situacao := 'OK'; detalhe := 'consulta executada';
  exception when others then
    verificacao := 'fn_busca_global responde'; situacao := 'FALHA'; detalhe := sqlerrm;
  end;
  return next;

  begin
    perform * from fn_comparar_campanhas('municipio',
      (select id from campanhas order by ano limit 1),
      (select id from campanhas order by ano desc limit 1)) limit 1;
    verificacao := 'fn_comparar_campanhas responde'; situacao := 'OK'; detalhe := 'consulta executada';
  exception when others then
    verificacao := 'fn_comparar_campanhas responde'; situacao := 'FALHA'; detalhe := sqlerrm;
  end;
  return next;

  begin
    perform * from fn_analise_campanha((select id from campanhas order by ano limit 1));
    verificacao := 'fn_analise_campanha responde'; situacao := 'OK'; detalhe := 'consulta executada';
  exception when others then
    verificacao := 'fn_analise_campanha responde'; situacao := 'FALHA'; detalhe := sqlerrm;
  end;
  return next;

  begin
    perform * from fn_analise_retencao(
      (select id from campanhas order by ano limit 1),
      (select id from campanhas order by ano desc limit 1), null) limit 1;
    verificacao := 'fn_analise_retencao responde'; situacao := 'OK'; detalhe := 'consulta executada';
  exception when others then
    verificacao := 'fn_analise_retencao responde'; situacao := 'FALHA'; detalhe := sqlerrm;
  end;
  return next;

  select count(*) into v_erro
  from pg_policies
  where schemaname = 'public'
    and qual like '%is_super_admin()%'
    and qual not like '%( SELECT is_super_admin()%';
  verificacao := 'RLS avaliada uma vez por consulta';
  situacao := case when v_erro = 0 then 'OK' else 'FALHA' end;
  detalhe := format('%s policy(ies) chamando is_super_admin() sem subquery', v_erro);
  return next;
end $$;
