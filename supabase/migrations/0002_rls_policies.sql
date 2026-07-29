-- Centro de Inteligência Eleitoral (CIE)
-- 0002: RLS enablement + helper functions + v1 super_admin-only policies.
--
-- v1.0 only ever seeds/uses the super_admin role, but every policy here is
-- written so that admin/coordenador_regional/consultor can be added later
-- as pure additive migrations (new policies), with no schema changes.

create or replace function public.current_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role() = 'super_admin';
$$;

-- ============ profiles ============
alter table profiles enable row level security;

create policy "profiles_self_read" on profiles
  for select using (id = auth.uid());

create policy "profiles_super_admin_full_access" on profiles
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ============ domain tables: uniform super_admin-full-access policy ============
do $$
declare
  t text;
  tables text[] := array[
    'estados', 'municipios', 'bairros', 'zonas', 'secoes',
    'campanhas', 'votos_secao', 'metas',
    'user_territorio_escopo',
    'import_column_mappings', 'import_batches', 'import_row_errors',
    'audit_log'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "%s_super_admin_full_access" on %I for all using (public.is_super_admin()) with check (public.is_super_admin())',
      t, t
    );
  end loop;
end $$;
