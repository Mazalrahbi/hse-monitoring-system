-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create custom types
CREATE TYPE user_role_type AS ENUM ('admin', 'editor', 'viewer', 'auditor');
CREATE TYPE kpi_status AS ENUM ('not_started', 'in_progress', 'done', 'blocked', 'needs_review');
CREATE TYPE period_type AS ENUM ('monthly', 'quarterly', 'yearly');
CREATE TYPE permission_type AS ENUM ('read', 'write', 'admin');

-- Core entities (operational)
CREATE TABLE org_site (
    site_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE section (
    section_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES org_site(site_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    order_idx INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(site_id, code)
);

CREATE TABLE kpi (
    kpi_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES section(section_id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_user_id UUID,
    target_formula TEXT,
    unit VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(section_id, code)
);

CREATE TABLE kpi_period (
    period_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_type period_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    label VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    quarter INTEGER,
    month INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_quarter CHECK (quarter IS NULL OR quarter BETWEEN 1 AND 4),
    CONSTRAINT valid_month CHECK (month IS NULL OR month BETWEEN 1 AND 12)
);

CREATE TABLE kpi_value (
    value_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_id UUID NOT NULL REFERENCES kpi(kpi_id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES kpi_period(period_id) ON DELETE CASCADE,
    numeric_value DECIMAL(15,4),
    text_value TEXT,
    status kpi_status NOT NULL DEFAULT 'not_started',
    evidence_url TEXT,
    evidence_metadata JSONB,
    last_calculated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    UNIQUE(kpi_id, period_id)
);

CREATE TABLE grid_cell (
    cell_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sheet VARCHAR(50) NOT NULL DEFAULT 'main',
    row_idx INTEGER NOT NULL,
    col_idx INTEGER NOT NULL,
    kpi_id UUID REFERENCES kpi(kpi_id) ON DELETE SET NULL,
    period_id UUID REFERENCES kpi_period(period_id) ON DELETE SET NULL,
    raw_value TEXT,
    display_value TEXT,
    fmt_style_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sheet, row_idx, col_idx)
);

CREATE TABLE export_template (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    storage_url TEXT NOT NULL,
    checksum VARCHAR(64),
    version VARCHAR(20) DEFAULT '1.0.0',
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE export_run (
    run_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES export_template(template_id),
    requested_by UUID NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    file_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    dataset_hash VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security & users
CREATE TABLE app_user (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    department VARCHAR(100),
    auth_user_id UUID UNIQUE, -- Reference to Supabase auth.users
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE role (
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name user_role_type UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_role (
    user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES role(role_id) ON DELETE CASCADE,
    granted_by UUID REFERENCES app_user(user_id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE policy_scope (
    scope_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    site_id UUID REFERENCES org_site(site_id) ON DELETE CASCADE,
    section_id UUID REFERENCES section(section_id) ON DELETE CASCADE,
    permission permission_type NOT NULL,
    granted_by UUID REFERENCES app_user(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Collaboration & audit
CREATE TABLE edit_session (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    page_path VARCHAR(500),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE change_set (
    change_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    field VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_by UUID NOT NULL REFERENCES app_user(user_id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT,
    source_page VARCHAR(500),
    ip_address INET,
    user_agent TEXT,
    session_id UUID REFERENCES edit_session(session_id)
);

CREATE TABLE event_log (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES app_user(user_id) ON DELETE SET NULL,
    verb VARCHAR(20) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id UUID,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    session_id UUID REFERENCES edit_session(session_id)
);

CREATE TABLE tamper_evidence (
    seq_id BIGSERIAL PRIMARY KEY,
    prev_hash VARCHAR(64),
    curr_hash VARCHAR(64) NOT NULL,
    change_id UUID NOT NULL REFERENCES change_set(change_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics (read-optimized)
CREATE TABLE dim_date (
    date_key INTEGER PRIMARY KEY,
    date_value DATE UNIQUE NOT NULL,
    day_of_week INTEGER,
    day_name VARCHAR(10),
    month INTEGER,
    month_name VARCHAR(10),
    quarter INTEGER,
    year INTEGER,
    is_weekend BOOLEAN,
    is_holiday BOOLEAN DEFAULT false
);

CREATE TABLE dim_site (
    site_key SERIAL PRIMARY KEY,
    site_id UUID UNIQUE NOT NULL REFERENCES org_site(site_id),
    site_name VARCHAR(255),
    site_code VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dim_section (
    section_key SERIAL PRIMARY KEY,
    section_id UUID UNIQUE NOT NULL REFERENCES section(section_id),
    section_name VARCHAR(255),
    section_code VARCHAR(50),
    site_key INTEGER REFERENCES dim_site(site_key),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dim_kpi (
    kpi_key SERIAL PRIMARY KEY,
    kpi_id UUID UNIQUE NOT NULL REFERENCES kpi(kpi_id),
    kpi_name VARCHAR(255),
    kpi_code VARCHAR(50),
    section_key INTEGER REFERENCES dim_section(section_key),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fact_kpi (
    kpi_key INTEGER NOT NULL REFERENCES dim_kpi(kpi_key),
    site_key INTEGER NOT NULL REFERENCES dim_site(site_key),
    section_key INTEGER NOT NULL REFERENCES dim_section(section_key),
    date_key INTEGER NOT NULL REFERENCES dim_date(date_key),
    period_key UUID NOT NULL REFERENCES kpi_period(period_id),
    status_key kpi_status NOT NULL,
    numeric_value DECIMAL(15,4),
    text_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (kpi_key, period_key, date_key)
);

-- Presence and real-time collaboration
CREATE TABLE user_presence (
    user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    page_path VARCHAR(500),
    cursor_position JSONB,
    selected_cell JSONB,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    is_typing BOOLEAN DEFAULT false,
    PRIMARY KEY (user_id, session_id)
);

CREATE TABLE cell_locks (
    cell_id VARCHAR(100) NOT NULL, -- sheet:row:col format
    user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
    PRIMARY KEY (cell_id)
);

-- Create indexes for performance
CREATE INDEX idx_section_site_id ON section(site_id);
CREATE INDEX idx_kpi_section_id ON kpi(section_id);
CREATE INDEX idx_kpi_value_kpi_period ON kpi_value(kpi_id, period_id);
CREATE INDEX idx_kpi_value_status ON kpi_value(status);
CREATE INDEX idx_change_set_entity ON change_set(entity, entity_id);
CREATE INDEX idx_change_set_changed_at ON change_set(changed_at);
CREATE INDEX idx_event_log_user_created ON event_log(user_id, created_at);
CREATE INDEX idx_fact_kpi_date ON fact_kpi(date_key);
CREATE INDEX idx_fact_kpi_site ON fact_kpi(site_key);
CREATE INDEX idx_user_presence_page ON user_presence(page_path);
CREATE INDEX idx_cell_locks_expires ON cell_locks(expires_at);

-- Add foreign key for kpi.owner_user_id after app_user table is created
ALTER TABLE kpi ADD CONSTRAINT fk_kpi_owner FOREIGN KEY (owner_user_id) REFERENCES app_user(user_id) ON DELETE SET NULL;
ALTER TABLE export_run ADD CONSTRAINT fk_export_run_user FOREIGN KEY (requested_by) REFERENCES app_user(user_id);

-- Create trigger functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_org_site_updated_at BEFORE UPDATE ON org_site FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_section_updated_at BEFORE UPDATE ON section FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kpi_updated_at BEFORE UPDATE ON kpi FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kpi_value_updated_at BEFORE UPDATE ON kpi_value FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grid_cell_updated_at BEFORE UPDATE ON grid_cell FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_user_updated_at BEFORE UPDATE ON app_user FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for audit trail
CREATE OR REPLACE FUNCTION create_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO change_set (entity, entity_id, field, new_value, changed_by, changed_at)
        VALUES (TG_TABLE_NAME, NEW.id, 'created', to_jsonb(NEW), 
                COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log changes for each modified field
        -- This would need to be expanded to handle specific fields
        INSERT INTO change_set (entity, entity_id, field, old_value, new_value, changed_by, changed_at)
        VALUES (TG_TABLE_NAME, NEW.id, 'updated', to_jsonb(OLD), to_jsonb(NEW),
                COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO change_set (entity, entity_id, field, old_value, changed_by, changed_at)
        VALUES (TG_TABLE_NAME, OLD.id, 'deleted', to_jsonb(OLD), null,
                COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create function to populate dimension tables
CREATE OR REPLACE FUNCTION populate_date_dimension(start_date DATE, end_date DATE)
RETURNS void AS $$
DECLARE
    date_cursor DATE := start_date;
BEGIN
    WHILE date_cursor <= end_date LOOP
        INSERT INTO dim_date (date_key, date_value, day_of_week, day_name, month, month_name, quarter, year, is_weekend)
        VALUES (
            EXTRACT(YEAR FROM date_cursor) * 10000 + EXTRACT(MONTH FROM date_cursor) * 100 + EXTRACT(DAY FROM date_cursor),
            date_cursor,
            EXTRACT(DOW FROM date_cursor),
            TO_CHAR(date_cursor, 'Day'),
            EXTRACT(MONTH FROM date_cursor),
            TO_CHAR(date_cursor, 'Month'),
            EXTRACT(QUARTER FROM date_cursor),
            EXTRACT(YEAR FROM date_cursor),
            EXTRACT(DOW FROM date_cursor) IN (0, 6)
        ) ON CONFLICT (date_key) DO NOTHING;
        
        date_cursor := date_cursor + INTERVAL '1 day';
    END LOOP;
END;
$$ language 'plpgsql';

-- Populate date dimension for 2024-2026
SELECT populate_date_dimension('2024-01-01'::DATE, '2026-12-31'::DATE);

-- Enable Row Level Security
ALTER TABLE org_site ENABLE ROW LEVEL SECURITY;
ALTER TABLE section ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_value ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_set ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;
