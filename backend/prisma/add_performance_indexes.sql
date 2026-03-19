-- ============================================================
-- MIGRATION: add_performance_indexes
-- Aplicar com: psql $DATABASE_URL -f add_performance_indexes.sql
-- CONCURRENTLY = sem bloqueio de tabela em produção
-- ============================================================

-- ── users ──────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_supervisor_id
  ON users(supervisor_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_is_active_role
  ON users(is_active, role);

-- ── clients ────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_created_by_id
  ON clients(created_by_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_created_at
  ON clients(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_integration_status
  ON clients(integration_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_tabulacao
  ON clients(tabulacao);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_account_opening_date
  ON clients(account_opening_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_has_open_account
  ON clients(has_open_account);

-- ── deals ──────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_pipeline_id
  ON deals(pipeline_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_stage_id
  ON deals(stage_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_responsible_id
  ON deals(responsible_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_client_id
  ON deals(client_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_status
  ON deals(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_created_at
  ON deals(created_at);

-- Índices compostos (para as queries mais frequentes do Kanban)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_pipeline_stage
  ON deals(pipeline_id, stage_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_pipeline_status
  ON deals(pipeline_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_responsible_status
  ON deals(responsible_id, status);

-- ── deal_history ───────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deal_history_deal_id
  ON deal_history(deal_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deal_history_deal_created
  ON deal_history(deal_id, created_at DESC);
