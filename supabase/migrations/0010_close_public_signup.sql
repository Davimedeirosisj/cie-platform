-- Centro de Inteligência Eleitoral (CIE)
-- 0010: expose a safe boolean check so the (unauthenticated) signup page
-- can tell whether the one v1.0 super_admin account already exists,
-- without granting anon/authenticated any read access to profiles rows.

create or replace function fn_super_admin_exists() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where role = 'super_admin');
$$;
