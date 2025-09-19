-- Run this script to apply all migrations manually
-- Migration 002: User Settings and Evidence Tables

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
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

-- Add RLS policies for user_settings
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own settings') THEN
        EXECUTE 'ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY';
        EXECUTE 'CREATE POLICY "Users can view their own settings" ON user_settings FOR SELECT USING (auth.uid()::text = user_id::text)';
        EXECUTE 'CREATE POLICY "Users can update their own settings" ON user_settings FOR ALL USING (auth.uid()::text = user_id::text)';
    END IF;
END $$;

-- Create evidence_attachment table for file uploads
CREATE TABLE IF NOT EXISTS evidence_attachment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_value_id UUID NOT NULL REFERENCES kpi_value(value_id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_by UUID NOT NULL REFERENCES app_user(user_id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Add RLS for evidence attachments
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view evidence attachments') THEN
        EXECUTE 'ALTER TABLE evidence_attachment ENABLE ROW LEVEL SECURITY';
        EXECUTE 'CREATE POLICY "Users can view evidence attachments" ON evidence_attachment FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "Users can manage evidence attachments" ON evidence_attachment FOR ALL USING (auth.uid()::text = uploaded_by::text)';
    END IF;
END $$;

-- Add trigger for updated_at on user_settings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_user_settings_updated_at') THEN
        EXECUTE 'CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
    END IF;
END $$;

-- Insert sample user settings for existing users
INSERT INTO user_settings (user_id, notifications_enabled, email_notifications, real_time_updates)
SELECT user_id, true, true, true FROM app_user 
ON CONFLICT (user_id) DO NOTHING;

SELECT 'Migrations completed successfully!' as result;
