-- Add Row Level Security policies for user profile management

-- Policies for app_user table
-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can read their own profile" ON app_user;
CREATE POLICY "Users can read their own profile" ON app_user
    FOR SELECT 
    USING (auth.uid()::text = auth_user_id::text);

-- Allow users to update their own profile (display_name, department only)
DROP POLICY IF EXISTS "Users can update their own profile" ON app_user;
CREATE POLICY "Users can update their own profile" ON app_user
    FOR UPDATE 
    USING (auth.uid()::text = auth_user_id::text)
    WITH CHECK (auth.uid()::text = auth_user_id::text);

-- Allow admins to read all users
DROP POLICY IF EXISTS "Admins can read all users" ON app_user;
CREATE POLICY "Admins can read all users" ON app_user
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_role ur
            JOIN role r ON ur.role_id = r.role_id  
            WHERE ur.user_id = (
                SELECT user_id FROM app_user 
                WHERE auth_user_id::text = auth.uid()::text
            )
            AND r.name = 'admin'
        )
    );

-- Allow admins to update all users
DROP POLICY IF EXISTS "Admins can update all users" ON app_user;
CREATE POLICY "Admins can update all users" ON app_user
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM user_role ur
            JOIN role r ON ur.role_id = r.role_id  
            WHERE ur.user_id = (
                SELECT user_id FROM app_user 
                WHERE auth_user_id::text = auth.uid()::text
            )
            AND r.name = 'admin'
        )
    );

-- Policies for user_settings table (enable RLS and add policies)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own settings
DROP POLICY IF EXISTS "Users can read their own settings" ON user_settings;
CREATE POLICY "Users can read their own settings" ON user_settings
    FOR SELECT 
    USING (
        user_id = (
            SELECT user_id FROM app_user 
            WHERE auth_user_id::text = auth.uid()::text
        )
    );

-- Allow users to insert their own settings  
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT 
    WITH CHECK (
        user_id = (
            SELECT user_id FROM app_user 
            WHERE auth_user_id::text = auth.uid()::text
        )
    );

-- Allow users to update their own settings
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE 
    USING (
        user_id = (
            SELECT user_id FROM app_user 
            WHERE auth_user_id::text = auth.uid()::text
        )
    );

-- Allow admins to read all settings
DROP POLICY IF EXISTS "Admins can read all settings" ON user_settings;
CREATE POLICY "Admins can read all settings" ON user_settings
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_role ur
            JOIN role r ON ur.role_id = r.role_id  
            WHERE ur.user_id = (
                SELECT user_id FROM app_user 
                WHERE auth_user_id::text = auth.uid()::text
            )
            AND r.name = 'admin'
        )
    );

-- Policies for user_role table (users need to read their own roles)
ALTER TABLE user_role ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own roles
DROP POLICY IF EXISTS "Users can read their own roles" ON user_role;
CREATE POLICY "Users can read their own roles" ON user_role
    FOR SELECT 
    USING (
        user_id = (
            SELECT user_id FROM app_user 
            WHERE auth_user_id::text = auth.uid()::text
        )
    );

-- Allow admins to manage all roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_role;
CREATE POLICY "Admins can manage all roles" ON user_role
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_role ur
            JOIN role r ON ur.role_id = r.role_id  
            WHERE ur.user_id = (
                SELECT user_id FROM app_user 
                WHERE auth_user_id::text = auth.uid()::text
            )
            AND r.name = 'admin'
        )
    );

-- Policies for role table (everyone can read roles for dropdown lists)
ALTER TABLE role ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read roles
DROP POLICY IF EXISTS "Authenticated users can read roles" ON role;
CREATE POLICY "Authenticated users can read roles" ON role
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Policies for change_set table (for audit trail)
-- Allow users to insert their own changes and read changes they made
DROP POLICY IF EXISTS "Users can read their own changes" ON change_set;
CREATE POLICY "Users can read their own changes" ON change_set
    FOR SELECT 
    USING (
        changed_by = (
            SELECT user_id FROM app_user 
            WHERE auth_user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Users can insert their own changes" ON change_set;
CREATE POLICY "Users can insert their own changes" ON change_set
    FOR INSERT 
    WITH CHECK (
        changed_by = (
            SELECT user_id FROM app_user 
            WHERE auth_user_id::text = auth.uid()::text
        )
    );

-- Allow admins to read all changes
DROP POLICY IF EXISTS "Admins can read all changes" ON change_set;
CREATE POLICY "Admins can read all changes" ON change_set
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_role ur
            JOIN role r ON ur.role_id = r.role_id  
            WHERE ur.user_id = (
                SELECT user_id FROM app_user 
                WHERE auth_user_id::text = auth.uid()::text
            )
            AND r.name = 'admin'
        )
    );
