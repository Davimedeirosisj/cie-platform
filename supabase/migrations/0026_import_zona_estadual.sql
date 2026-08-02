-- Import RPC for the estado-level zona (0024). A zona is now keyed by
-- (estado_id, numero_zona) rather than (municipio_id, numero_zona), so a file
-- covering several municípios served by the same zona lands on one row
-- instead of creating a duplicate per município.
create or replace function fn_import_votos_batch(
  p_campanha_id uuid,
  p_batch_id uuid,
  p_estado_id uuid,
  p_rows jsonb
) returns table (total int, sucesso int, erro int)
language plpgsql security invoker set search_path = public set statement_timeout = '180s' as $$
declare
  v_row jsonb; v_idx int;
  v_municipio_nome text; v_bairro_nome text;
  v_zona_txt text; v_secao_txt text;
  v_zona_num int; v_secao_num int;
  v_local text; v_votos int;
  v_municipio_id uuid; v_bairro_id uuid; v_zona_id uuid; v_secao_id uuid;
  v_total int := 0; v_sucesso int := 0; v_erro int := 0;
begin
  for v_idx in 0 .. jsonb_array_length(p_rows) - 1 loop
    v_row := p_rows -> v_idx;
    v_total := v_total + 1;
    v_bairro_id := null; v_zona_id := null; v_secao_id := null;
    begin
      v_municipio_nome := nullif(trim(v_row->>'municipio'), '');
      v_bairro_nome    := nullif(trim(v_row->>'bairro'), '');
      v_zona_txt       := nullif(trim(v_row->>'zona'), '');
      v_secao_txt      := nullif(trim(v_row->>'secao'), '');
      v_local          := nullif(trim(v_row->>'local_votacao'), '');

      if v_municipio_nome is null then
        raise exception 'Município é obrigatório';
      end if;

      v_votos := nullif(trim(v_row->>'votos'), '')::int;
      if v_votos is null or v_votos < 0 then
        raise exception 'Quantidade de votos inválida';
      end if;

      if v_secao_txt is not null and (v_zona_txt is null or v_bairro_nome is null) then
        raise exception 'Seção precisa de zona e bairro para ser localizada';
      end if;

      insert into municipios (estado_id, nome) values (p_estado_id, v_municipio_nome)
      on conflict (estado_id, nome) do nothing;
      select id into v_municipio_id from municipios
        where estado_id = p_estado_id and nome = v_municipio_nome;

      if v_bairro_nome is not null then
        insert into bairros (municipio_id, nome) values (v_municipio_id, v_bairro_nome)
        on conflict (municipio_id, nome) do nothing;
        select id into v_bairro_id from bairros
          where municipio_id = v_municipio_id and nome = v_bairro_nome;
      end if;

      if v_zona_txt is not null then
        v_zona_num := v_zona_txt::int;
        if v_zona_num <= 0 then raise exception 'Número da zona inválido'; end if;
        insert into zonas (estado_id, numero_zona) values (p_estado_id, v_zona_num)
        on conflict (estado_id, numero_zona) do nothing;
        select id into v_zona_id from zonas
          where estado_id = p_estado_id and numero_zona = v_zona_num;
      end if;

      if v_secao_txt is not null then
        v_secao_num := v_secao_txt::int;
        if v_secao_num <= 0 then raise exception 'Número da seção inválido'; end if;
        insert into secoes (zona_id, numero_secao, bairro_id, local_votacao)
        values (v_zona_id, v_secao_num, v_bairro_id, v_local)
        on conflict (zona_id, numero_secao) do update
          set local_votacao = coalesce(excluded.local_votacao, secoes.local_votacao),
              bairro_id = excluded.bairro_id;
        select id into v_secao_id from secoes
          where zona_id = v_zona_id and numero_secao = v_secao_num;
      end if;

      if v_secao_id is not null then
        insert into votos (campanha_id, nivel, secao_id, quantidade_votos, import_batch_id)
        values (p_campanha_id, 'secao', v_secao_id, v_votos, p_batch_id)
        on conflict (campanha_id, secao_id) where nivel = 'secao'
        do update set quantidade_votos = excluded.quantidade_votos,
                      import_batch_id = excluded.import_batch_id, updated_at = now();
      elsif v_zona_id is not null then
        insert into votos (campanha_id, nivel, zona_id, quantidade_votos, import_batch_id)
        values (p_campanha_id, 'zona', v_zona_id, v_votos, p_batch_id)
        on conflict (campanha_id, zona_id) where nivel = 'zona'
        do update set quantidade_votos = excluded.quantidade_votos,
                      import_batch_id = excluded.import_batch_id, updated_at = now();
      elsif v_bairro_id is not null then
        insert into votos (campanha_id, nivel, bairro_id, quantidade_votos, import_batch_id)
        values (p_campanha_id, 'bairro', v_bairro_id, v_votos, p_batch_id)
        on conflict (campanha_id, bairro_id) where nivel = 'bairro'
        do update set quantidade_votos = excluded.quantidade_votos,
                      import_batch_id = excluded.import_batch_id, updated_at = now();
      else
        insert into votos (campanha_id, nivel, municipio_id, quantidade_votos, import_batch_id)
        values (p_campanha_id, 'municipio', v_municipio_id, v_votos, p_batch_id)
        on conflict (campanha_id, municipio_id) where nivel = 'municipio'
        do update set quantidade_votos = excluded.quantidade_votos,
                      import_batch_id = excluded.import_batch_id, updated_at = now();
      end if;

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
