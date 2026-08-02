-- current_role() is an internal detail of is_super_admin(); take it off the API.
--
-- 0032 removed anon's EXECUTE. `authenticated` does not need it either: the
-- only caller is is_super_admin(), which is SECURITY DEFINER owned by postgres,
-- so current_role() runs as postgres there regardless of who asked. No app code
-- calls /rest/v1/rpc/current_role.
--
-- is_super_admin() keeps EXECUTE for `authenticated` and must: every RLS policy
-- invokes it as the querying role, so revoking it would deny the whole app.
revoke execute on function public.current_role() from authenticated;
