-- Centro de Inteligência Eleitoral (CIE)
-- 0004: generic audit-log trigger, attached to votos_secao, metas, and the
--       territorial CRUD tables ("registro de alterações" from the PRD).

create or replace function fn_audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log(table_name, record_id, action, changed_by,
                         campanha_id, old_data, new_data)
  values (
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    lower(TG_OP)::audit_action,
    auth.uid(),
    coalesce(NEW.campanha_id, OLD.campanha_id),
    case when TG_OP in ('update','delete') then to_jsonb(OLD) end,
    case when TG_OP in ('insert','update') then to_jsonb(NEW) end
  );
  return coalesce(NEW, OLD);
end $$;

create trigger trg_audit_votos   after insert or update or delete on votos_secao for each row execute function fn_audit_trigger();
create trigger trg_audit_metas   after insert or update or delete on metas       for each row execute function fn_audit_trigger();
create trigger trg_audit_municip after insert or update or delete on municipios  for each row execute function fn_audit_trigger();
create trigger trg_audit_bairros after insert or update or delete on bairros     for each row execute function fn_audit_trigger();
create trigger trg_audit_zonas   after insert or update or delete on zonas      for each row execute function fn_audit_trigger();
create trigger trg_audit_secoes  after insert or update or delete on secoes    for each row execute function fn_audit_trigger();
