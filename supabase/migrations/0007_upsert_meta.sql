-- Centro de Inteligência Eleitoral (CIE)
-- 0007: atomic upsert for metas, one branch per nivel so each INSERT can
-- target the matching partial unique index (metas_uniq_municipio, etc.)
-- in its ON CONFLICT clause -- something the Supabase JS .upsert() helper
-- cannot express for partial indexes.

create or replace function fn_upsert_meta(
  p_campanha_id uuid, p_nivel meta_nivel, p_target_id uuid, p_valor_meta int
) returns metas
language plpgsql security invoker set search_path = public as $$
declare
  v_row metas;
begin
  if p_nivel = 'municipio' then
    insert into metas (campanha_id, nivel, municipio_id, valor_meta, created_by, updated_by)
    values (p_campanha_id, p_nivel, p_target_id, p_valor_meta, auth.uid(), auth.uid())
    on conflict (campanha_id, municipio_id) where nivel = 'municipio'
    do update set valor_meta = excluded.valor_meta, updated_by = auth.uid(), updated_at = now()
    returning * into v_row;
  elsif p_nivel = 'bairro' then
    insert into metas (campanha_id, nivel, bairro_id, valor_meta, created_by, updated_by)
    values (p_campanha_id, p_nivel, p_target_id, p_valor_meta, auth.uid(), auth.uid())
    on conflict (campanha_id, bairro_id) where nivel = 'bairro'
    do update set valor_meta = excluded.valor_meta, updated_by = auth.uid(), updated_at = now()
    returning * into v_row;
  elsif p_nivel = 'zona' then
    insert into metas (campanha_id, nivel, zona_id, valor_meta, created_by, updated_by)
    values (p_campanha_id, p_nivel, p_target_id, p_valor_meta, auth.uid(), auth.uid())
    on conflict (campanha_id, zona_id) where nivel = 'zona'
    do update set valor_meta = excluded.valor_meta, updated_by = auth.uid(), updated_at = now()
    returning * into v_row;
  else
    insert into metas (campanha_id, nivel, secao_id, valor_meta, created_by, updated_by)
    values (p_campanha_id, p_nivel, p_target_id, p_valor_meta, auth.uid(), auth.uid())
    on conflict (campanha_id, secao_id) where nivel = 'secao'
    do update set valor_meta = excluded.valor_meta, updated_by = auth.uid(), updated_at = now()
    returning * into v_row;
  end if;
  return v_row;
end $$;
