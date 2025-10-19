-- Diagnostic script to debug profile settings issues
-- Run this to understand what's happening with profile saves

-- 1. Check if tables exist and their structure
\dt app_user;
\dt user_settings;

-- 2. Check current users and their data
SELECT 
    user_id,
    auth_user_id,
    email,
    display_name,
    department,
    created_at
FROM app_user 
ORDER BY created_at DESC;

-- 3. Check if RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('app_user', 'user_settings', 'user_role', 'role', 'change_set');

-- 4. Check user_settings table
SELECT * FROM user_settings;

-- 5. Try a test update (replace USER_ID_HERE with actual user_id)
-- UPDATE app_user SET display_name = 'Test Update' WHERE user_id = 'USER_ID_HERE';

-- 6. Check permissions on tables
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name IN ('app_user', 'user_settings')
AND grantee != 'postgres';

-- 7. Check if there are any active policies (should be empty if RLS is disabled)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('app_user', 'user_settings', 'user_role', 'role', 'change_set');

-- Instructions:
-- 1. Run this script to see the current state
-- 2. Note down a user_id from step 2
-- 3. Uncomment step 5 and replace USER_ID_HERE with the actual user_id
-- 4. Run the update to see if it works manually
