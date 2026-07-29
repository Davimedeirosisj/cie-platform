-- Centro de Inteligência Eleitoral (CIE)
-- 0005: auto-create a profiles row when someone signs up via Supabase Auth.
-- The one designated super_admin email is promoted automatically; anyone
-- else who somehow signs up lands as 'consultor' (read-only) by default.

create or replace function fn_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nome, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    case when lower(new.email) = 'davimendeiros@gmail.com' then 'super_admin'::user_role
         else 'consultor'::user_role end
  );
  return new;
end $$;

create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function fn_handle_new_user();
