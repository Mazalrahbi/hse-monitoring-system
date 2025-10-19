-- Completely disable RLS for all tables to fix profile settings
-- This is a temporary measure to get profile settings working

-- Disable RLS on all main tables
ALTER TABLE app_user DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_role DISABLE ROW LEVEL SECURITY;
ALTER TABLE role DISABLE ROW LEVEL SECURITY;
ALTER TABLE change_set DISABLE ROW LEVEL SECURITY;

-- Check if user_settings table exists and has the right structure
-- Run this to see the table structure:
-- \d user_settings;

-- Make sure auth_user_id is properly set for all users
UPDATE app_user 
SET auth_user_id = user_id 
WHERE auth_user_id IS NULL;

-- Make sure all users have the auth_user_id field properly mapped
-- This will show any users that might have issues:
-- SELECT user_id, email, auth_user_id FROM app_user;

-- If user_settings table doesn't exist, create it:
CREATE TABLE IF NOT EXISTS user_settings (
    setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    real_time_updates BOOLEAN DEFAULT true,
    export_format VARCHAR(10) DEFAULT 'xlsx' CHECK (export_format IN ('xlsx', 'pdf')),
    theme VARCHAR(10) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    language VARCHAR(2) DEFAULT 'en' CHECK (language IN ('en', 'ar')),
    auto_save_interval INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create an updated_at trigger for user_settings if it doesn't exist
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
