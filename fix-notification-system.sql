-- ============================================================================
-- COMPREHENSIVE FIX FOR EMAIL NOTIFICATION SYSTEM
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- STEP 1: Show current state
-- ============================================================================
SELECT '=== STEP 1: Current Auth State ===' as status;

SELECT 
    'Your current auth ID:' as info,
    auth.uid() as auth_id,
    auth.email() as logged_in_email;

-- STEP 2: Show your app_user record
-- ============================================================================
SELECT '=== STEP 2: Your App User Record ===' as status;

SELECT 
    user_id,
    auth_user_id,
    email,
    CASE 
        WHEN auth_user_id = auth.uid() THEN '✅ MATCHES'
        ELSE '❌ DOES NOT MATCH'
    END as match_status
FROM app_user
WHERE email = auth.email();

-- STEP 3: Fix auth_user_id for your account
-- ============================================================================
SELECT '=== STEP 3: Fixing Your auth_user_id ===' as status;

UPDATE app_user
SET auth_user_id = auth.uid()
WHERE email = auth.email()
AND (auth_user_id IS NULL OR auth_user_id != auth.uid());

SELECT 
    'Fixed your record:' as info,
    user_id,
    auth_user_id,
    email
FROM app_user
WHERE email = auth.email();

-- STEP 4: Create notification preferences for ALL users
-- ============================================================================
SELECT '=== STEP 4: Creating Notification Preferences ===' as status;

INSERT INTO notification_preferences (user_id, notification_type, enabled, frequency)
SELECT 
    u.user_id,
    t.notification_type,
    false,  -- Disabled by default (opt-in)
    'immediate'
FROM app_user u
CROSS JOIN (
    VALUES 
        ('kpi_status_change'),
        ('kpi_value_update'),
        ('kpi_blocked_alert')
) AS t(notification_type)
ON CONFLICT (user_id, notification_type) DO NOTHING;

SELECT 
    COUNT(*) as total_preferences,
    COUNT(DISTINCT user_id) as users_with_preferences
FROM notification_preferences;

-- STEP 5: Show YOUR preferences
-- ============================================================================
SELECT '=== STEP 5: Your Notification Preferences ===' as status;

SELECT 
    notification_type,
    enabled,
    frequency,
    created_at
FROM notification_preferences
WHERE user_id = (SELECT user_id FROM app_user WHERE email = auth.email())
ORDER BY notification_type;

-- STEP 6: Fix RLS policies
-- ============================================================================
SELECT '=== STEP 6: Fixing RLS Policies ===' as status;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can manage their own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can view their own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can manage their preferences" ON notification_preferences;

-- Create ONE comprehensive policy that checks auth_user_id
CREATE POLICY "Users can manage their notification preferences"
    ON notification_preferences
    FOR ALL
    TO authenticated
    USING (
        user_id IN (
            SELECT user_id 
            FROM app_user 
            WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id IN (
            SELECT user_id 
            FROM app_user 
            WHERE auth_user_id = auth.uid()
        )
    );

-- STEP 7: Verify RLS policy
-- ============================================================================
SELECT '=== STEP 7: RLS Policy Verification ===' as status;

SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notification_preferences';

-- STEP 8: Test insert (this should work now!)
-- ============================================================================
SELECT '=== STEP 8: Testing Insert (Should Work Now) ===' as status;

-- Try to toggle kpi_status_change to TRUE
INSERT INTO notification_preferences (user_id, notification_type, enabled, frequency)
SELECT 
    user_id,
    'kpi_status_change',
    true,
    'immediate'
FROM app_user
WHERE auth_user_id = auth.uid()
ON CONFLICT (user_id, notification_type) 
DO UPDATE SET enabled = true, updated_at = NOW();

-- Show result
SELECT 
    'Test result:' as info,
    notification_type,
    enabled,
    CASE WHEN enabled THEN '✅ SUCCESS!' ELSE '❌ FAILED' END as status
FROM notification_preferences
WHERE user_id = (SELECT user_id FROM app_user WHERE auth_user_id = auth.uid())
AND notification_type = 'kpi_status_change';

-- STEP 9: Final verification
-- ============================================================================
SELECT '=== STEP 9: Final Verification ===' as status;

SELECT 
    'Summary:' as info,
    (SELECT COUNT(*) FROM notification_preferences) as total_preferences,
    (SELECT COUNT(*) FROM notification_preferences WHERE user_id = (SELECT user_id FROM app_user WHERE auth_user_id = auth.uid())) as your_preferences,
    (SELECT COUNT(*) FROM notification_preferences WHERE enabled = true AND user_id = (SELECT user_id FROM app_user WHERE auth_user_id = auth.uid())) as your_enabled_preferences;

-- ============================================================================
-- DONE! 
-- ============================================================================
SELECT '=== ✅ ALL DONE! ===' as status;
SELECT 'Now refresh your browser and test toggling notifications in Settings page!' as next_step;
