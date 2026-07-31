-- Centro de Inteligência Eleitoral (CIE) — seed data
-- Applied once via execute_sql when the project was provisioned.
-- Kept here so the seed is reproducible on a fresh database.

-- v1.0 operates in a single estado; the import assigns every município to it.
insert into estados (sigla, nome) values ('CE', 'Ceará') on conflict do nothing;

insert into campanhas (nome, cargo, ano, status, is_campanha_meta) values
  ('Campanha 2022', 'Deputada Federal', 2022, 'encerrada', false),
  ('Campanha 2024', 'Vereadora', 2024, 'encerrada', false),
  ('Campanha 2026', 'Deputada Federal', 2026, 'planejamento', true)
on conflict do nothing;

-- The super_admin user is NOT seeded here: it is created when the owner
-- signs up through the app's own /signup page with their own email and
-- password. The trigger fn_handle_new_user() (see migration 0005)
-- automatically promotes the designated email to 'super_admin'.
