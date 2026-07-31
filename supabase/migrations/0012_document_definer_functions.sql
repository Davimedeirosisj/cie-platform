-- Centro de Inteligência Eleitoral (CIE)
-- 0012: documentation-only migration.
--
-- Supabase's linter flags current_role(), is_super_admin() and
-- fn_super_admin_exists() as "SECURITY DEFINER callable by anon/authenticated".
-- All three are intentionally callable, and revoking EXECUTE would break the
-- app -- these COMMENTs exist so that isn't "fixed" by mistake later.

comment on function public.current_role() is
  'SECURITY DEFINER by design: reads the CALLER''s own role via auth.uid(), so it
   leaks nothing about other users (anon gets null). Must stay executable by
   anon+authenticated: the RLS policies on every domain table call it, and
   Postgres evaluates policy expressions with the querying role''s privileges --
   revoking EXECUTE would make those queries fail with "permission denied"
   instead of returning an empty set.';

comment on function public.is_super_admin() is
  'SECURITY DEFINER by design; same reasoning as current_role() -- it only
   reports on the caller, and every "*_super_admin_full_access" RLS policy
   depends on it being executable by the querying role.';

comment on function public.fn_super_admin_exists() is
  'Deliberately callable by anon: /signup is an unauthenticated page and needs
   this to know whether to close itself off (see migration 0010). Returns a
   single boolean -- whether ANY super_admin exists -- and never exposes which
   account, so it discloses only "this install has been set up", which is
   already evident from the login page.';
