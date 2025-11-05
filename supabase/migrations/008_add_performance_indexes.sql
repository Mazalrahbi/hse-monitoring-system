-- Migration: Add Performance Optimization Indexes
-- Description: Add missing indexes to improve query performance based on common access patterns

-- ============================================================================
-- AUTHENTICATION & USER LOOKUPS
-- ============================================================================

-- app_user.auth_user_id is used VERY frequently for login/session validation
CREATE INDEX IF NOT EXISTS idx_app_user_auth_user_id ON app_user(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- app_user.email is used for user lookups and login
CREATE INDEX IF NOT EXISTS idx_app_user_email ON app_user(email);

-- app_user.is_active for filtering active users
CREATE INDEX IF NOT EXISTS idx_app_user_is_active ON app_user(is_active) WHERE is_active = true;

-- ============================================================================
-- KPI PERIOD QUERIES (Analytics Dashboard uses these heavily)
-- ============================================================================

-- Composite index for year + period_type (used in analytics filters)
CREATE INDEX IF NOT EXISTS idx_kpi_period_year_type ON kpi_period(year, period_type);

-- Month index for monthly period queries
CREATE INDEX IF NOT EXISTS idx_kpi_period_month ON kpi_period(month) WHERE month IS NOT NULL;

-- Active periods filter
CREATE INDEX IF NOT EXISTS idx_kpi_period_active ON kpi_period(is_active) WHERE is_active = true;

-- Period label for display lookups
CREATE INDEX IF NOT EXISTS idx_kpi_period_label ON kpi_period(label);

-- ============================================================================
-- KPI QUERIES
-- ============================================================================

-- kpi.is_active is used to filter active KPIs in almost every query
CREATE INDEX IF NOT EXISTS idx_kpi_is_active ON kpi(is_active) WHERE is_active = true;

-- kpi.code for code-based lookups
CREATE INDEX IF NOT EXISTS idx_kpi_code ON kpi(code);

-- Composite: section_id + is_active (common filter combination)
CREATE INDEX IF NOT EXISTS idx_kpi_section_active ON kpi(section_id, is_active) WHERE is_active = true;

-- Owner lookups
CREATE INDEX IF NOT EXISTS idx_kpi_owner_user_id ON kpi(owner_user_id) WHERE owner_user_id IS NOT NULL;

-- ============================================================================
-- SECTION QUERIES
-- ============================================================================

-- section.is_active for filtering active sections
CREATE INDEX IF NOT EXISTS idx_section_is_active ON section(is_active) WHERE is_active = true;

-- section.code for code-based lookups
CREATE INDEX IF NOT EXISTS idx_section_code ON section(code);

-- Composite: site_id + is_active + order_idx (for ordered active sections)
CREATE INDEX IF NOT EXISTS idx_section_site_active_order ON section(site_id, is_active, order_idx) WHERE is_active = true;

-- Order index for sorting
CREATE INDEX IF NOT EXISTS idx_section_order_idx ON section(order_idx);

-- ============================================================================
-- KPI VALUE QUERIES (Heavy read table)
-- ============================================================================

-- period_id alone (used in analytics for period-specific queries)
CREATE INDEX IF NOT EXISTS idx_kpi_value_period_id ON kpi_value(period_id);

-- status + period_id (used for status filtering per period)
CREATE INDEX IF NOT EXISTS idx_kpi_value_status_period ON kpi_value(status, period_id);

-- kpi_id alone (looking up all values for a KPI)
CREATE INDEX IF NOT EXISTS idx_kpi_value_kpi_id ON kpi_value(kpi_id);

-- updated_at for recent changes queries
CREATE INDEX IF NOT EXISTS idx_kpi_value_updated_at ON kpi_value(updated_at DESC);

-- ============================================================================
-- GRID CELL QUERIES
-- ============================================================================

-- kpi_id for cell-to-KPI lookups
CREATE INDEX IF NOT EXISTS idx_grid_cell_kpi_id ON grid_cell(kpi_id) WHERE kpi_id IS NOT NULL;

-- period_id for cell-to-period lookups
CREATE INDEX IF NOT EXISTS idx_grid_cell_period_id ON grid_cell(period_id) WHERE period_id IS NOT NULL;

-- Composite for sheet navigation
CREATE INDEX IF NOT EXISTS idx_grid_cell_sheet_row ON grid_cell(sheet, row_idx);

-- ============================================================================
-- USER ROLES & PERMISSIONS
-- ============================================================================

-- role_id for finding users with a specific role
CREATE INDEX IF NOT EXISTS idx_user_role_role_id ON user_role(role_id);

-- granted_at for audit queries
CREATE INDEX IF NOT EXISTS idx_user_role_granted_at ON user_role(granted_at DESC);

-- ============================================================================
-- POLICY SCOPE (Permissions)
-- ============================================================================

-- site_id for site-level permissions
CREATE INDEX IF NOT EXISTS idx_policy_scope_site_id ON policy_scope(site_id) WHERE site_id IS NOT NULL;

-- section_id for section-level permissions
CREATE INDEX IF NOT EXISTS idx_policy_scope_section_id ON policy_scope(section_id) WHERE section_id IS NOT NULL;

-- permission type filter
CREATE INDEX IF NOT EXISTS idx_policy_scope_permission ON policy_scope(permission);

-- expires_at for expiring permissions
CREATE INDEX IF NOT EXISTS idx_policy_scope_expires_at ON policy_scope(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- AUDIT & CHANGE TRACKING
-- ============================================================================

-- changed_by for user activity queries
CREATE INDEX IF NOT EXISTS idx_change_set_changed_by ON change_set(changed_by);

-- Composite: entity + changed_at for entity history
CREATE INDEX IF NOT EXISTS idx_change_set_entity_changed_at ON change_set(entity, changed_at DESC);

-- session_id for session-based audit
CREATE INDEX IF NOT EXISTS idx_change_set_session_id ON change_set(session_id) WHERE session_id IS NOT NULL;

-- ============================================================================
-- EVENT LOG
-- ============================================================================

-- verb for filtering by action type
CREATE INDEX IF NOT EXISTS idx_event_log_verb ON event_log(verb);

-- entity + entity_id for entity-specific logs
CREATE INDEX IF NOT EXISTS idx_event_log_entity ON event_log(entity, entity_id) WHERE entity_id IS NOT NULL;

-- created_at desc for recent events (already exists in composite, but useful alone)
CREATE INDEX IF NOT EXISTS idx_event_log_created_at ON event_log(created_at DESC);

-- session_id for session tracking
CREATE INDEX IF NOT EXISTS idx_event_log_session_id ON event_log(session_id) WHERE session_id IS NOT NULL;

-- ============================================================================
-- EDIT SESSIONS
-- ============================================================================

-- user_id + is_active for active sessions
CREATE INDEX IF NOT EXISTS idx_edit_session_user_active ON edit_session(user_id, is_active) WHERE is_active = true;

-- started_at for session history
CREATE INDEX IF NOT EXISTS idx_edit_session_started_at ON edit_session(started_at DESC);

-- ============================================================================
-- EXPORT OPERATIONS
-- ============================================================================

-- template_id + created_at for template usage tracking
CREATE INDEX IF NOT EXISTS idx_export_run_template_created ON export_run(template_id, created_at DESC);

-- requested_by + started_at for user export history
CREATE INDEX IF NOT EXISTS idx_export_run_user_started ON export_run(requested_by, started_at DESC);

-- status for monitoring export jobs
CREATE INDEX IF NOT EXISTS idx_export_run_status ON export_run(status);

-- ============================================================================
-- DIMENSION TABLES (Analytics)
-- ============================================================================

-- dim_site.site_code for lookups
CREATE INDEX IF NOT EXISTS idx_dim_site_code ON dim_site(site_code);

-- dim_section.section_code for lookups
CREATE INDEX IF NOT EXISTS idx_dim_section_code ON dim_section(section_code);

-- dim_section.site_key for site filtering
CREATE INDEX IF NOT EXISTS idx_dim_section_site_key ON dim_section(site_key);

-- dim_kpi.kpi_code for lookups
CREATE INDEX IF NOT EXISTS idx_dim_kpi_code ON dim_kpi(kpi_code);

-- dim_kpi.section_key for section filtering
CREATE INDEX IF NOT EXISTS idx_dim_kpi_section_key ON dim_kpi(section_key);

-- ============================================================================
-- FACT TABLE (Analytics)
-- ============================================================================

-- Composite indexes for common analytics queries
CREATE INDEX IF NOT EXISTS idx_fact_kpi_section_date ON fact_kpi(section_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_kpi_period_status ON fact_kpi(period_key, status_key);
CREATE INDEX IF NOT EXISTS idx_fact_kpi_site_date_status ON fact_kpi(site_key, date_key, status_key);

-- updated_at for recent data queries
CREATE INDEX IF NOT EXISTS idx_fact_kpi_updated_at ON fact_kpi(updated_at DESC);

-- ============================================================================
-- STATISTICS & MAINTENANCE
-- ============================================================================

-- Analyze tables to update query planner statistics
ANALYZE app_user;
ANALYZE kpi;
ANALYZE kpi_value;
ANALYZE kpi_period;
ANALYZE section;
ANALYZE grid_cell;
ANALYZE change_set;
ANALYZE event_log;
ANALYZE fact_kpi;

-- Add comments for documentation
COMMENT ON INDEX idx_app_user_auth_user_id IS 'Critical for auth lookups - used on every request';
COMMENT ON INDEX idx_kpi_period_year_type IS 'Used heavily in Analytics Dashboard filters';
COMMENT ON INDEX idx_kpi_value_period_id IS 'Critical for period-based KPI queries in Analytics';
COMMENT ON INDEX idx_kpi_is_active IS 'Filters active KPIs - used in almost every query';
COMMENT ON INDEX idx_section_is_active IS 'Filters active sections - used in most queries';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Performance indexes created successfully!';
    RAISE NOTICE 'Total new indexes added: ~40';
    RAISE NOTICE 'Run ANALYZE on tables to update statistics';
END $$;
