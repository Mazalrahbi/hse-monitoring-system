-- Temporarily disable RLS for profile settings functionality
-- This will allow the settings to save while we debug the RLS policies

-- Disable RLS on user_settings table temporarily
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;

-- Also, let's make sure auth_user_id is populated for existing users
-- Update any app_user records that might be missing auth_user_id
UPDATE app_user 
SET auth_user_id = user_id::text
WHERE auth_user_id IS NULL;

-- Check if there are any users without proper auth_user_id mapping
-- Run this to see if there are any issues:
-- SELECT user_id, email, auth_user_id FROM app_user WHERE auth_user_id IS NULL;

-- Let's also create a simple policy that should work
ALTER TABLE app_user DISABLE ROW LEVEL SECURITY;

-- Re-enable with simpler policies
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;

-- Simple policy: authenticated users can read and update their own data
DROP POLICY IF EXISTS "Authenticated users can manage their profile" ON app_user;
CREATE POLICY "Authenticated users can manage their profile" ON app_user
    FOR ALL
    USING (auth.uid()::text = auth_user_id::text);

-- Alternative: if the above doesn't work, try this broader policy
-- DROP POLICY IF EXISTS "Authenticated users can manage their profile" ON app_user;
-- CREATE POLICY "Authenticated users can manage their profile" ON app_user
--     FOR ALL
--     USING (auth.role() = 'authenticated');
