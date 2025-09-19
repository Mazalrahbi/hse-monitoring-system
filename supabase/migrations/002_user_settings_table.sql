-- Create user_settings table
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    real_time_updates BOOLEAN DEFAULT true,
    export_format TEXT DEFAULT 'xlsx' CHECK (export_format IN ('xlsx', 'pdf')),
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ar')),
    auto_save_interval INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings" ON user_settings
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own settings" ON user_settings
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Create evidence_attachment table for file uploads
CREATE TABLE evidence_attachment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_value_id UUID NOT NULL REFERENCES kpi_value(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_by UUID NOT NULL REFERENCES app_user(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Add RLS for evidence attachments
ALTER TABLE evidence_attachment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view evidence attachments" ON evidence_attachment
    FOR SELECT USING (true);

CREATE POLICY "Users can manage evidence attachments" ON evidence_attachment
    FOR ALL USING (auth.uid()::text = uploaded_by::text);

-- Add trigger for updated_at on user_settings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
