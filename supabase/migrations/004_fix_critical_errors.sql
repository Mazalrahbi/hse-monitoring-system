-- Migration 004: Fix Critical Errors from Previous Migrations
-- This migration corrects foreign key references, adds missing indexes, and improves data integrity

-- =====================================================
-- 1. FIX USER_SETTINGS TABLE
-- =====================================================
DROP TABLE IF EXISTS user_settings CASCADE;

CREATE TABLE user_settings (
    settings_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    real_time_updates BOOLEAN DEFAULT true,
    export_format TEXT DEFAULT 'xlsx' CHECK (export_format IN ('xlsx', 'pdf')),
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ar')),
    auto_save_interval INTEGER DEFAULT 30 CHECK (auto_save_interval >= 10 AND auto_save_interval <= 300),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

COMMENT ON TABLE user_settings IS 'User preferences and application settings';
COMMENT ON COLUMN user_settings.auto_save_interval IS 'Auto-save interval in seconds (10-300)';

-- =====================================================
-- 2. FIX EVIDENCE_ATTACHMENT TABLE  
-- =====================================================
DROP TABLE IF EXISTS evidence_attachment CASCADE;

CREATE TABLE evidence_attachment (
    attachment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_value_id UUID NOT NULL REFERENCES kpi_value(value_id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 104857600), -- Max 100MB
    mime_type TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES app_user(user_id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evidence_attachment_kpi_value_id ON evidence_attachment(kpi_value_id);
CREATE INDEX idx_evidence_attachment_uploaded_by ON evidence_attachment(uploaded_by);
CREATE INDEX idx_evidence_attachment_uploaded_at ON evidence_attachment(uploaded_at DESC);
CREATE INDEX idx_evidence_attachment_active ON evidence_attachment(is_active) WHERE is_active = true;

COMMENT ON TABLE evidence_attachment IS 'File attachments for KPI values as evidence or supporting documentation';
COMMENT ON COLUMN evidence_attachment.file_size IS 'File size in bytes (max 100MB)';

-- =====================================================
-- 3. ADD MISSING INDEXES
-- =====================================================

-- User role indexes
CREATE INDEX IF NOT EXISTS idx_user_role_role_id ON user_role(role_id);
CREATE INDEX IF NOT EXISTS idx_user_role_granted_at ON user_role(granted_at DESC);

-- Policy scope indexes
CREATE INDEX IF NOT EXISTS idx_policy_scope_user_id ON policy_scope(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_scope_site_id ON policy_scope(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_policy_scope_section_id ON policy_scope(section_id) WHERE section_id IS NOT NULL;

-- Edit session indexes
CREATE INDEX IF NOT EXISTS idx_edit_session_user_id ON edit_session(user_id);
CREATE INDEX IF NOT EXISTS idx_edit_session_active ON edit_session(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_edit_session_started_at ON edit_session(started_at DESC);

-- Event log indexes
CREATE INDEX IF NOT EXISTS idx_event_log_session_id ON event_log(session_id) WHERE session_id IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_kpi_value_kpi_period_status ON kpi_value(kpi_id, period_id, status);
CREATE INDEX IF NOT EXISTS idx_change_set_entity_date ON change_set(entity, entity_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_log_user_entity_date ON event_log(user_id, entity, created_at DESC);

-- =====================================================
-- 4. ADD RLS POLICIES WITH CORRECT UUID COMPARISON
-- =====================================================

-- User settings RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
CREATE POLICY "Users can view their own settings" ON user_settings
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Evidence attachment RLS
ALTER TABLE evidence_attachment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view evidence attachments" ON evidence_attachment;
CREATE POLICY "Users can view evidence attachments" ON evidence_attachment
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can upload evidence attachments" ON evidence_attachment;
CREATE POLICY "Users can upload evidence attachments" ON evidence_attachment
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "Users can update their own attachments" ON evidence_attachment;
CREATE POLICY "Users can update their own attachments" ON evidence_attachment
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "Users can delete their own attachments" ON evidence_attachment;
CREATE POLICY "Users can delete their own attachments" ON evidence_attachment
    FOR DELETE
    TO authenticated
    USING (auth.uid() = uploaded_by);

-- =====================================================
-- 5. ADD TRIGGERS
-- =====================================================

CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evidence_attachment_updated_at 
    BEFORE UPDATE ON evidence_attachment 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. ADD VALIDATION CONSTRAINTS
-- =====================================================

-- Ensure non-negative numeric values
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_numeric_value_non_negative'
    ) THEN
        ALTER TABLE kpi_value 
            ADD CONSTRAINT chk_numeric_value_non_negative 
            CHECK (numeric_value IS NULL OR numeric_value >= 0);
    END IF;
END $$;

-- Ensure valid email format
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_email_format'
    ) THEN
        ALTER TABLE app_user 
            ADD CONSTRAINT chk_email_format 
            CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;
END $$;

-- Ensure valid period dates
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_period_dates_valid'
    ) THEN
        ALTER TABLE kpi_period 
            ADD CONSTRAINT chk_period_dates_valid 
            CHECK (end_date > start_date);
    END IF;
END $$;

-- =====================================================
-- 7. ADD TABLE AND COLUMN COMMENTS
-- =====================================================

COMMENT ON TABLE kpi IS 'Key Performance Indicators for HSE monitoring';
COMMENT ON COLUMN kpi.target_formula IS 'Formula or target value for the KPI';
COMMENT ON COLUMN kpi.unit IS 'Unit of measurement for the KPI';

COMMENT ON TABLE kpi_value IS 'Actual KPI values recorded per period';
COMMENT ON COLUMN kpi_value.version IS 'Optimistic locking version number for concurrency control';
COMMENT ON COLUMN kpi_value.evidence_url IS 'URL to evidence file (deprecated - use kpi_attachment table)';

COMMENT ON TABLE kpi_period IS 'Time periods for KPI tracking (monthly, quarterly, yearly)';
COMMENT ON COLUMN kpi_period.label IS 'Human-readable period label (e.g., "Jan-25")';

COMMENT ON TABLE section IS 'HSE monitoring sections grouping related KPIs';
COMMENT ON COLUMN section.order_idx IS 'Display order for sections';

COMMENT ON TABLE change_set IS 'Audit trail of all data changes';
COMMENT ON COLUMN change_set.version IS 'Currently unused - reserved for future use';

-- =====================================================
-- 8. CREATE MATERIALIZED VIEW FOR ANALYTICS
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS mv_kpi_completion_rate CASCADE;

CREATE MATERIALIZED VIEW mv_kpi_completion_rate AS
SELECT 
    k.kpi_id,
    k.code as kpi_code,
    k.name as kpi_name,
    s.section_id,
    s.name as section_name,
    s.order_idx as section_order,
    COUNT(kv.value_id) as total_periods,
    COUNT(kv.value_id) FILTER (WHERE kv.status = 'done') as completed_periods,
    COUNT(kv.value_id) FILTER (WHERE kv.status = 'in_progress') as in_progress_periods,
    COUNT(kv.value_id) FILTER (WHERE kv.status = 'blocked') as blocked_periods,
    COUNT(kv.value_id) FILTER (WHERE kv.status = 'not_started') as not_started_periods,
    COALESCE(
        ROUND(
            COUNT(kv.value_id) FILTER (WHERE kv.status = 'done')::numeric / 
            NULLIF(COUNT(kv.value_id), 0)::numeric * 100, 
            2
        ), 
        0
    ) as completion_percentage,
    MAX(kv.updated_at) as last_updated
FROM kpi k
JOIN section s ON k.section_id = s.section_id
LEFT JOIN kpi_value kv ON k.kpi_id = kv.kpi_id
WHERE k.is_active = true AND s.is_active = true
GROUP BY k.kpi_id, k.code, k.name, s.section_id, s.name, s.order_idx;

CREATE UNIQUE INDEX ON mv_kpi_completion_rate(kpi_id);
CREATE INDEX ON mv_kpi_completion_rate(section_id);
CREATE INDEX ON mv_kpi_completion_rate(completion_percentage DESC);

COMMENT ON MATERIALIZED VIEW mv_kpi_completion_rate IS 'Pre-calculated KPI completion statistics for analytics dashboard';

-- =====================================================
-- 9. CREATE FUNCTION TO REFRESH MATERIALIZED VIEW
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_kpi_completion_rate()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpi_completion_rate;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_kpi_completion_rate IS 'Refresh the KPI completion rate materialized view (call after data changes)';

-- =====================================================
-- 10. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get KPI completion status summary
CREATE OR REPLACE FUNCTION get_kpi_status_summary(p_kpi_id UUID DEFAULT NULL)
RETURNS TABLE (
    status kpi_status,
    count BIGINT,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kv.status,
        COUNT(*) as count,
        ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) as percentage
    FROM kpi_value kv
    WHERE (p_kpi_id IS NULL OR kv.kpi_id = p_kpi_id)
    GROUP BY kv.status
    ORDER BY 
        CASE kv.status
            WHEN 'done' THEN 1
            WHEN 'in_progress' THEN 2
            WHEN 'blocked' THEN 3
            WHEN 'needs_review' THEN 4
            WHEN 'not_started' THEN 5
        END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_kpi_status_summary IS 'Get status distribution for all KPIs or a specific KPI';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 004 completed successfully';
    RAISE NOTICE 'Fixed: Foreign key references';
    RAISE NOTICE 'Added: Missing indexes for performance';
    RAISE NOTICE 'Added: RLS policies with correct UUID comparison';
    RAISE NOTICE 'Added: Validation constraints';
    RAISE NOTICE 'Added: Table/column comments for documentation';
    RAISE NOTICE 'Created: Materialized view for analytics';
END $$;
