-- Centro de Inteligência Eleitoral (CIE)
-- 0006: fix advisor warnings from 0001-0005
--  - pin search_path on functions (prevents search_path hijacking)
--  - move citext extension out of public
--  - revoke PostgREST RPC exposure on trigger-only functions

alter function fn_set_updated_at() set search_path = public;
alter function fn_comparar_campanhas(meta_nivel, uuid, uuid) set search_path = public;
alter function fn_busca_global(text) set search_path = public;

alter extension citext set schema extensions;

-- fn_audit_trigger and fn_handle_new_user only ever run via triggers; the
-- firing DML statement doesn't need EXECUTE on them, so revoking here just
-- removes their accidental exposure as callable PostgREST RPC endpoints.
revoke execute on function fn_audit_trigger() from public, anon, authenticated;
revoke execute on function fn_handle_new_user() from public, anon, authenticated;
