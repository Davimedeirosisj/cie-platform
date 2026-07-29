-- Centro de Inteligência Eleitoral (CIE)
-- 0001: extensions, enums, territorial hierarchy, campanhas, profiles,
--       votos_secao, metas, import pipeline tables, audit_log table.

create extension if not exists citext;
create extension if not exists pgcrypto;

-- ============ ENUMS ============
create type user_role as enum ('super_admin','admin','coordenador_regional','consultor');
create type import_status as enum ('pendente','processando','validado','importado','erro');
create type meta_nivel as enum ('municipio','bairro','zona','secao');
create type audit_action as enum ('insert','update','delete');
create type campaign_status as enum ('planejamento','ativa','encerrada');

-- ============ TERRITORIAL HIERARCHY ============
create table estados (
  id uuid primary key default gen_random_uuid(),
  sigla char(2) not null unique,
  nome citext not null unique
);

create table municipios (
  id uuid primary key default gen_random_uuid(),
  estado_id uuid not null references estados(id) on delete restrict,
  nome citext not null,
  ibge_code text,
  latitude double precision,
  longitude double precision,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (estado_id, nome)
);

create table bairros (
  id uuid primary key default gen_random_uuid(),
  municipio_id uuid not null references municipios(id) on delete restrict,
  nome citext not null,
  latitude double precision,
  longitude double precision,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (municipio_id, nome)
);

create table zonas (
  id uuid primary key default gen_random_uuid(),
  bairro_id uuid not null references bairros(id) on delete restrict,
  numero_zona int not null check (numero_zona > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bairro_id, numero_zona)
);

create table secoes (
  id uuid primary key default gen_random_uuid(),
  zona_id uuid not null references zonas(id) on delete restrict,
  numero_secao int not null check (numero_secao > 0),
  local_votacao text,
  endereco_local text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (zona_id, numero_secao)
);

create index municipios_estado_id_idx on municipios(estado_id);
create index bairros_municipio_id_idx on bairros(municipio_id);
create index zonas_bairro_id_idx on zonas(bairro_id);
create index secoes_zona_id_idx on secoes(zona_id);

-- ============ CAMPANHAS ============
create table campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cargo text not null,
  ano int not null,
  status campaign_status not null default 'planejamento',
  is_campanha_meta boolean not null default false,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nome, ano)
);

-- ============ AUTH / PROFILES ============
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email citext not null unique,
  role user_role not null default 'consultor',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Future-ready territorial scoping for Coordenador Regional (unused in v1, present now).
create table user_territorio_escopo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  nivel meta_nivel not null default 'municipio',
  estado_id uuid references estados(id) on delete cascade,
  municipio_id uuid references municipios(id) on delete cascade,
  bairro_id uuid references bairros(id) on delete cascade,
  zona_id uuid references zonas(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index user_territorio_escopo_uniq on user_territorio_escopo (
  user_id, nivel,
  coalesce(municipio_id, '00000000-0000-0000-0000-000000000000'),
  coalesce(bairro_id, '00000000-0000-0000-0000-000000000000'),
  coalesce(zona_id, '00000000-0000-0000-0000-000000000000')
);

-- ============ IMPORT PIPELINE ============
create table import_column_mappings (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  mapeamento jsonb not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table import_batches (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas(id) on delete cascade,
  nome_arquivo text not null,
  storage_path text not null,
  mapping_id uuid references import_column_mappings(id),
  mapeamento_snapshot jsonb not null,
  status import_status not null default 'pendente',
  total_linhas int not null default 0,
  linhas_sucesso int not null default 0,
  linhas_erro int not null default 0,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index import_batches_campanha_id_idx on import_batches(campanha_id);

-- ============ VOTE FACTS (finest grain only: Seção) ============
create table votos_secao (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas(id) on delete cascade,
  secao_id uuid not null references secoes(id) on delete cascade,
  quantidade_votos int not null check (quantidade_votos >= 0),
  import_batch_id uuid references import_batches(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campanha_id, secao_id)
);
create index votos_secao_campanha_id_idx on votos_secao(campanha_id);
create index votos_secao_secao_id_idx on votos_secao(secao_id);

create table import_row_errors (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references import_batches(id) on delete cascade,
  linha_numero int not null,
  dados_originais jsonb not null,
  erro text not null
);
create index import_row_errors_batch_id_idx on import_row_errors(import_batch_id);

-- ============ METAS (polymorphic target, independent of votes) ============
create table metas (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas(id) on delete cascade,
  nivel meta_nivel not null,
  municipio_id uuid references municipios(id) on delete cascade,
  bairro_id    uuid references bairros(id) on delete cascade,
  zona_id      uuid references zonas(id) on delete cascade,
  secao_id     uuid references secoes(id) on delete cascade,
  valor_meta int not null check (valor_meta >= 0),
  observacoes text,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meta_target_matches_nivel check (
    (nivel = 'municipio' and municipio_id is not null and bairro_id is null and zona_id is null and secao_id is null) or
    (nivel = 'bairro'    and bairro_id    is not null and municipio_id is null and zona_id is null and secao_id is null) or
    (nivel = 'zona'      and zona_id      is not null and municipio_id is null and bairro_id is null and secao_id is null) or
    (nivel = 'secao'     and secao_id     is not null and municipio_id is null and bairro_id is null and zona_id is null)
  )
);
create unique index metas_uniq_municipio on metas (campanha_id, municipio_id) where nivel = 'municipio';
create unique index metas_uniq_bairro    on metas (campanha_id, bairro_id)    where nivel = 'bairro';
create unique index metas_uniq_zona      on metas (campanha_id, zona_id)      where nivel = 'zona';
create unique index metas_uniq_secao     on metas (campanha_id, secao_id)     where nivel = 'secao';

-- ============ AUDIT LOG ============
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action audit_action not null,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now(),
  campanha_id uuid,
  old_data jsonb,
  new_data jsonb
);
create index audit_log_table_record_idx on audit_log (table_name, record_id);
create index audit_log_changed_at_idx on audit_log (changed_at desc);

-- ============ updated_at maintenance ============
create or replace function fn_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_updated_at_municipios before update on municipios for each row execute function fn_set_updated_at();
create trigger trg_updated_at_bairros before update on bairros for each row execute function fn_set_updated_at();
create trigger trg_updated_at_zonas before update on zonas for each row execute function fn_set_updated_at();
create trigger trg_updated_at_secoes before update on secoes for each row execute function fn_set_updated_at();
create trigger trg_updated_at_campanhas before update on campanhas for each row execute function fn_set_updated_at();
create trigger trg_updated_at_profiles before update on profiles for each row execute function fn_set_updated_at();
create trigger trg_updated_at_votos_secao before update on votos_secao for each row execute function fn_set_updated_at();
create trigger trg_updated_at_metas before update on metas for each row execute function fn_set_updated_at();
create trigger trg_updated_at_import_column_mappings before update on import_column_mappings for each row execute function fn_set_updated_at();
