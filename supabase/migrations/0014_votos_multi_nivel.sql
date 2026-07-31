-- Centro de Inteligência Eleitoral (CIE)
-- 0014: allow votes at any territorial level, not only Seção.
--
-- WHY: v1.0 assumed every spreadsheet carried Zona + Seção, so votos_secao
-- was keyed on secao_id alone. Real campaign files vary -- TSE exports have
-- section detail, but other sources are already aggregated by bairro. Those
-- files were impossible to import at all.
--
-- The new `votos` table mirrors the `metas` shape: a `nivel` plus exactly one
-- territorial FK. Aggregation sums a território's own row plus every
-- descendant's, so bairro-level and seção-level imports both roll up.
--
-- DOUBLE COUNTING: a bairro total AND its seções would each be counted,
-- inflating the result. fn_import_votos_batch clears other-grain rows for the
-- same município+campanha, making "last import wins per município" the rule.

-- ============ New polymorphic fact table ============
create table votos (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas(id) on delete cascade,
  nivel meta_nivel not null,
  municipio_id uuid references municipios(id) on delete cascade,
  bairro_id    uuid references bairros(id) on delete cascade,
  zona_id      uuid references zonas(id) on delete cascade,
  secao_id     uuid references secoes(id) on delete cascade,
  quantidade_votos int not null check (quantidade_votos >= 0),
  import_batch_id uuid references import_batches(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint votos_target_matches_nivel check (
    (nivel = 'municipio' and municipio_id is not null and bairro_id is null and zona_id is null and secao_id is null) or
    (nivel = 'bairro'    and bairro_id    is not null and municipio_id is null and zona_id is null and secao_id is null) or
    (nivel = 'zona'      and zona_id      is not null and municipio_id is null and bairro_id is null and secao_id is null) or
    (nivel = 'secao'     and secao_id     is not null and municipio_id is null and bairro_id is null and zona_id is null)
  )
);

-- Idempotent re-import keys, one per nivel (mirrors the metas indexes).
create unique index votos_uniq_municipio on votos (campanha_id, municipio_id) where nivel = 'municipio';
create unique index votos_uniq_bairro    on votos (campanha_id, bairro_id)    where nivel = 'bairro';
create unique index votos_uniq_zona      on votos (campanha_id, zona_id)      where nivel = 'zona';
create unique index votos_uniq_secao     on votos (campanha_id, secao_id)     where nivel = 'secao';

create index votos_campanha_idx on votos (campanha_id);
create index votos_campanha_qtd_idx on votos (campanha_id, quantidade_votos desc) where quantidade_votos > 0;

-- Carry over anything already imported at seção level.
insert into votos (campanha_id, nivel, secao_id, quantidade_votos, import_batch_id, created_at, updated_at)
select campanha_id, 'secao', secao_id, quantidade_votos, import_batch_id, created_at, updated_at
from votos_secao;

alter table votos enable row level security;
create policy "votos_super_admin_full_access" on votos
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create trigger trg_updated_at_votos before update on votos
  for each row execute function fn_set_updated_at();
create trigger trg_audit_votos_multi after insert or update or delete on votos
  for each row execute function fn_audit_trigger();

-- ============ Replace the votos_secao-based views ============
drop view if exists vw_ranking_municipio;
drop view if exists vw_ranking_bairro;
drop view if exists vw_ranking_zona;
drop view if exists vw_ranking_secao;
drop view if exists vw_votos_municipio;
drop view if exists vw_votos_bairro;
drop view if exists vw_votos_zona;

drop trigger if exists trg_audit_votos on votos_secao;
drop table votos_secao;

-- Each território's total = its own row (if the data came in at that grain)
-- plus every descendant's. A row is attributed to exactly one território, so
-- provided a subtree holds only one grain nothing is counted twice.
create view vw_votos_zona with (security_invoker = true) as
select z.id as zona_id, z.bairro_id, v.campanha_id, sum(v.quantidade_votos) as total_votos
from zonas z
join votos v
  on v.zona_id = z.id
  or v.secao_id in (select s.id from secoes s where s.zona_id = z.id)
group by z.id, z.bairro_id, v.campanha_id;

create view vw_votos_bairro with (security_invoker = true) as
select b.id as bairro_id, b.municipio_id, v.campanha_id, sum(v.quantidade_votos) as total_votos
from bairros b
join votos v
  on v.bairro_id = b.id
  or v.zona_id in (select z.id from zonas z where z.bairro_id = b.id)
  or v.secao_id in (
       select s.id from secoes s join zonas z on z.id = s.zona_id where z.bairro_id = b.id)
group by b.id, b.municipio_id, v.campanha_id;

create view vw_votos_municipio with (security_invoker = true) as
select m.id as municipio_id, m.estado_id, v.campanha_id, sum(v.quantidade_votos) as total_votos
from municipios m
join votos v
  on v.municipio_id = m.id
  or v.bairro_id in (select b.id from bairros b where b.municipio_id = m.id)
  or v.zona_id in (
       select z.id from zonas z join bairros b on b.id = z.bairro_id where b.municipio_id = m.id)
  or v.secao_id in (
       select s.id from secoes s
       join zonas z on z.id = s.zona_id
       join bairros b on b.id = z.bairro_id
       where b.municipio_id = m.id)
group by m.id, m.estado_id, v.campanha_id;

create view vw_ranking_municipio with (security_invoker = true) as
select v.municipio_id, v.campanha_id, v.total_votos,
       rank() over (partition by v.campanha_id order by v.total_votos desc) as ranking
from vw_votos_municipio v;

create view vw_ranking_bairro with (security_invoker = true) as
select v.bairro_id, v.campanha_id, v.total_votos,
       rank() over (partition by v.campanha_id order by v.total_votos desc) as ranking
from vw_votos_bairro v;

create view vw_ranking_zona with (security_invoker = true) as
select v.zona_id, v.campanha_id, v.total_votos,
       rank() over (partition by v.campanha_id order by v.total_votos desc) as ranking
from vw_votos_zona v;

create view vw_ranking_secao with (security_invoker = true) as
select v.secao_id, v.campanha_id, v.quantidade_votos as total_votos,
       rank() over (partition by v.campanha_id order by v.quantidade_votos desc) as ranking
from votos v
where v.nivel = 'secao';
