-- Restrict every policy to the `authenticated` role.
--
-- They were all created TO public, which includes `anon`. RLS still denied the
-- data correctly -- an unauthenticated request reads zero rows from every
-- table -- but denying it *cost* a scan: is_super_admin() is STABLE, so the
-- planner cannot fold it to a constant and must filter row by row. On
-- audit_log (158k rows) an anonymous `order by changed_at desc limit 1` walked
-- the whole index finding nothing and hit the 3s statement timeout, while the
-- same query as a role that can see rows returns in 1,4ms off the index.
--
-- With the policies scoped to `authenticated`, an anonymous request matches no
-- permissive policy at all and is refused immediately, without touching the
-- table. Same answer, none of the work.
--
-- Nothing legitimately needs anonymous table access: /login and /signup reach
-- the database only through fn_super_admin_exists(), which is SECURITY DEFINER
-- and bypasses RLS by design (see 0012), and every other route sits behind the
-- proxy's auth redirect.
do $$
declare
  r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public' and 'public' = any (roles)
  loop
    execute format('alter policy %I on public.%I to authenticated', r.policyname, r.tablename);
  end loop;
end $$;
