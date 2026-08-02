-- fn_busca_global still joined zonas to bairros via zonas.bairro_id, the
-- column dropped in 0017 when zona became a child of município (a zona spans
-- many bairros, so it never belonged under one). Like fn_comparar_campanhas
-- before it, a SQL function resolves its references at call time, so the
-- function survived the migration and only failed when someone searched --
-- which the client swallowed, leaving Pesquisa Global permanently empty.
--
-- A zona's context is now its município. Seções gain their bairro as context
-- too, which is what someone searching a seção number actually wants to see.
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
  select 'zona'::meta_nivel, z.id, ('Zona ' || z.numero_zona)::text, m.nome::text
  from zonas z join municipios m on m.id = z.municipio_id
  where z.numero_zona::text ilike '%' || p_termo || '%'
  union all
  select 'secao'::meta_nivel, s.id, ('Seção ' || s.numero_secao)::text,
         coalesce(b.nome::text, s.local_votacao, '')::text
  from secoes s left join bairros b on b.id = s.bairro_id
  where s.numero_secao::text ilike '%' || p_termo || '%'
     or s.local_votacao ilike '%' || p_termo || '%'
  limit 50;
$$;
