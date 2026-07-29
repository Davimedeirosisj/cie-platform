-- Centro de Inteligência Eleitoral (CIE)
-- 0008: storage bucket for uploaded spreadsheets (private, super_admin only)
--       + the transactional import-commit RPC.

insert into storage.buckets (id, name, public)
values ('import-uploads', 'import-uploads', false)
on conflict (id) do nothing;

create policy "import_uploads_super_admin_all"
  on storage.objects for all
  using (bucket_id = 'import-uploads' and public.is_super_admin())
  with check (bucket_id = 'import-uploads' and public.is_super_admin());

-- ============ Import commit RPC ============
-- Resolves/creates the territorial hierarchy referenced by each row (by
-- name/number, case-insensitive via citext) and upserts votos_secao on
-- (campanha_id, secao_id) -- the mechanism that makes re-imports update
-- rather than duplicate. Row-level failures are caught individually and
-- recorded in import_row_errors without aborting the whole batch.
create or replace function fn_import_votos_batch(
  p_campanha_id uuid,
  p_batch_id uuid,
  p_estado_id uuid,
  p_rows jsonb
) returns table (total int, sucesso int, erro int)
language plpgsql security invoker set search_path = public as $$
declare
  v_row jsonb;
  v_idx int;
  v_municipio_nome text;
  v_bairro_nome text;
  v_zona_num int;
  v_secao_num int;
  v_local text;
  v_votos int;
  v_municipio_id uuid;
  v_bairro_id uuid;
  v_zona_id uuid;
  v_secao_id uuid;
  v_total int := 0;
  v_sucesso int := 0;
  v_erro int := 0;
begin
  for v_idx in 0 .. jsonb_array_length(p_rows) - 1 loop
    v_row := p_rows -> v_idx;
    v_total := v_total + 1;
    begin
      v_municipio_nome := nullif(trim(v_row->>'municipio'), '');
      v_bairro_nome := nullif(trim(v_row->>'bairro'), '');
      v_local := nullif(trim(v_row->>'local_votacao'), '');

      if v_municipio_nome is null then
        raise exception 'Município é obrigatório';
      end if;
      if v_bairro_nome is null then
        raise exception 'Bairro é obrigatório';
      end if;

      v_zona_num := nullif(trim(v_row->>'zona'), '')::int;
      v_secao_num := nullif(trim(v_row->>'secao'), '')::int;
      v_votos := nullif(trim(v_row->>'votos'), '')::int;

      if v_zona_num is null or v_zona_num <= 0 then
        raise exception 'Número da zona inválido';
      end if;
      if v_secao_num is null or v_secao_num <= 0 then
        raise exception 'Número da seção inválido';
      end if;
      if v_votos is null or v_votos < 0 then
        raise exception 'Quantidade de votos inválida';
      end if;

      insert into municipios (estado_id, nome)
      values (p_estado_id, v_municipio_nome)
      on conflict (estado_id, nome) do nothing;
      select id into v_municipio_id from municipios
        where estado_id = p_estado_id and nome = v_municipio_nome;

      insert into bairros (municipio_id, nome)
      values (v_municipio_id, v_bairro_nome)
      on conflict (municipio_id, nome) do nothing;
      select id into v_bairro_id from bairros
        where municipio_id = v_municipio_id and nome = v_bairro_nome;

      insert into zonas (bairro_id, numero_zona)
      values (v_bairro_id, v_zona_num)
      on conflict (bairro_id, numero_zona) do nothing;
      select id into v_zona_id from zonas
        where bairro_id = v_bairro_id and numero_zona = v_zona_num;

      insert into secoes (zona_id, numero_secao, local_votacao)
      values (v_zona_id, v_secao_num, v_local)
      on conflict (zona_id, numero_secao)
        do update set local_votacao = coalesce(excluded.local_votacao, secoes.local_votacao);
      select id into v_secao_id from secoes
        where zona_id = v_zona_id and numero_secao = v_secao_num;

      insert into votos_secao (campanha_id, secao_id, quantidade_votos, import_batch_id)
      values (p_campanha_id, v_secao_id, v_votos, p_batch_id)
      on conflict (campanha_id, secao_id) do update
        set quantidade_votos = excluded.quantidade_votos,
            import_batch_id = excluded.import_batch_id,
            updated_at = now();

      v_sucesso := v_sucesso + 1;
    exception when others then
      v_erro := v_erro + 1;
      insert into import_row_errors (import_batch_id, linha_numero, dados_originais, erro)
      values (p_batch_id, v_idx + 1, v_row, sqlerrm);
    end;
  end loop;

  update import_batches
  set status = 'importado', total_linhas = v_total, linhas_sucesso = v_sucesso,
      linhas_erro = v_erro, completed_at = now()
  where id = p_batch_id;

  return query select v_total, v_sucesso, v_erro;
end $$;
