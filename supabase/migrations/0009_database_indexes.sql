-- Centro de Inteligência Eleitoral (CIE)
-- 0009: Strategic indexes for query optimization
--
-- Performance Analysis Results:
-- - Aggregation views (vw_votos_*) benefit from composite indexes
-- - votos_secao needs index on (campanha_id, quantidade_votos) for rankings
-- - metas queries need index on (campanha_id, nivel)
-- - import_batches needs index on status for pipeline queries
-- - Full-text search needs trigram index for ILIKE performance

-- ============ VOTOS_SECAO - Critical Path Indexes ============
-- Index for ranking queries: ORDER BY total_votos DESC
create index idx_votos_secao_campanha_votos
  on votos_secao (campanha_id, quantidade_votos desc)
  where quantidade_votos > 0;

-- Index for campaign-specific aggregations
create index idx_votos_secao_secao_campanha
  on votos_secao (secao_id, campanha_id);

-- ============ METAS - Query Optimization ============
-- Index for fetching metas by campaign + nivel (used in rankings)
create index idx_metas_campanha_nivel
  on metas (campanha_id, nivel);

-- Index for metas by campaign only (dashboard queries)
create index idx_metas_campanha
  on metas (campanha_id);

-- Partial indexes for each nivel (reduce index size)
create index idx_metas_municipio
  on metas (campanha_id, municipio_id)
  where nivel = 'municipio' and municipio_id is not null;

create index idx_metas_bairro
  on metas (campanha_id, bairro_id)
  where nivel = 'bairro' and bairro_id is not null;

create index idx_metas_zona
  on metas (campanha_id, zona_id)
  where nivel = 'zona' and zona_id is not null;

create index idx_metas_secao
  on metas (campanha_id, secao_id)
  where nivel = 'secao' and secao_id is not null;

-- ============ TERRITORIAL HIERARCHY - Reverse Lookups ============
-- Index for finding children by parent ID
create index idx_bairros_municipio_nome
  on bairros (municipio_id, nome);

create index idx_zonas_bairro_numero
  on zonas (bairro_id, numero_zona);

create index idx_secoes_zona_numero
  on secoes (zona_id, numero_secao);

-- ============ IMPORT PIPELINE ============
-- Index for finding pending/processing batches
create index idx_import_batches_status
  on import_batches (status, created_at desc)
  where status in ('pendente', 'processando');

-- Index for error tracking
create index idx_import_row_errors_batch_linha
  on import_row_errors (import_batch_id, linha_numero);

-- ============ PROFILES & AUTH ============
-- Index for role-based queries (RLS enforcement)
create index idx_profiles_role_ativo
  on profiles (role, ativo)
  where ativo = true;

-- Index for finding active users
create index idx_profiles_email_ativo
  on profiles (email, ativo);

-- ============ SEARCH OPTIMIZATION ============
-- Enable trigram extension for ILIKE performance
create extension if not exists pg_trgm;

-- Trigram indexes for fuzzy search (fn_busca_global)
create index idx_municipios_nome_trgm
  on municipios using gin (nome gin_trgm_ops);

create index idx_bairros_nome_trgm
  on bairros using gin (nome gin_trgm_ops);

create index idx_zonas_numero_trgm
  on zonas using gin ((numero_zona::text) gin_trgm_ops);

create index idx_secoes_numero_trgm
  on secoes using gin ((numero_secao::text) gin_trgm_ops);

create index idx_secoes_local_trgm
  on secoes using gin (local_votacao gin_trgm_ops);

-- ============ CAMPAIGN PERFORMANCE ============
-- Index for campaign-wide statistics (dashboard)
create index idx_campanhas_ano_status
  on campanhas (ano desc, status);

-- Index for meta campaign selection
create index idx_campanhas_meta
  on campanhas (is_campanha_meta, status);

-- ============ AUDIT LOGGING ============
-- Index for audit queries by campaign
create index idx_audit_log_campanha_action
  on audit_log (campanha_id, action, changed_at desc)
  where campanha_id is not null;

-- ============ USER TERRITORY SCOPE ============
-- Index for territorial access control
create index idx_user_territorio_escopo_user
  on user_territorio_escopo (user_id, nivel);

create index idx_user_territorio_escopo_municipio
  on user_territorio_escopo (municipio_id, user_id)
  where municipio_id is not null;

-- ============ ANALYZE & COLLECT STATISTICS ============
-- Update table statistics for query planner optimization
analyze municipios;
analyze bairros;
analyze zonas;
analyze secoes;
analyze votos_secao;
analyze metas;
analyze campanhas;
analyze profiles;
analyze import_batches;
analyze audit_log;
