-- Take the RLS helpers off the anonymous API surface.
--
-- current_role() and is_super_admin() are SECURITY DEFINER, so PostgREST
-- exposes them as /rest/v1/rpc/... callable by `anon`. Nothing needs that:
-- since 0031 every policy is TO authenticated, so anon never triggers them,
-- and no app code calls either function directly (is_super_admin() is only
-- referenced inside policies; current_role() only inside is_super_admin()).
--
-- is_super_admin() still calls current_role() fine after this: it runs as its
-- owner (postgres), not as the caller.
--
-- fn_super_admin_exists() deliberately keeps anon EXECUTE -- /signup and the
-- signUp action call it while logged out to decide whether public signup is
-- still open (0012).
revoke execute on function public.current_role() from public, anon;
revoke execute on function public.is_super_admin() from public, anon;
