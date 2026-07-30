-- Centro de Inteligência Eleitoral (CIE)
-- 0011: deactivated profiles (ativo = false) must lose access even if their
-- role is still super_admin -- current_role()/is_super_admin() previously
-- ignored the ativo flag entirely, which would make Configurações › Usuários'
-- "desativar" toggle silently do nothing.

create or replace function public.current_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and ativo = true;
$$;
