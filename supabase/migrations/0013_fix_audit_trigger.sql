-- Centro de Inteligência Eleitoral (CIE)
-- 0013: fix two bugs in fn_audit_trigger() (from migration 0004).
--
-- BUG 1 (critical): the function read NEW.campanha_id / OLD.campanha_id
-- directly, but it is also attached to municipios/bairros/zonas/secoes, which
-- have no campanha_id column. PL/pgSQL raises `record "new" has no field
-- "campanha_id"` at runtime, so EVERY insert into the territorial hierarchy
-- failed -- silently breaking both manual CRUD and spreadsheet imports (an
-- import of 2837 rows produced 2837 errors and 0 rows). Reading the fields out
-- of to_jsonb(NEW) instead yields NULL for tables that lack the column.
--
-- BUG 2: TG_OP is upper-case ('INSERT'/'UPDATE'/'DELETE'), but the CASE arms
-- compared it against lower-case literals, so old_data/new_data were always
-- NULL -- the audit log recorded that a change happened but never what changed.

create or replace function fn_audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_new jsonb := case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) end;
  v_old jsonb := case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) end;
begin
  insert into audit_log(table_name, record_id, action, changed_by,
                        campanha_id, old_data, new_data)
  values (
    TG_TABLE_NAME,
    coalesce((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid),
    lower(TG_OP)::audit_action,
    auth.uid(),
    coalesce((v_new ->> 'campanha_id')::uuid, (v_old ->> 'campanha_id')::uuid),
    v_old,
    v_new
  );
  return coalesce(NEW, OLD);
end $$;
