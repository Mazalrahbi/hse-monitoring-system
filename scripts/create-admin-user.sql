-- Script to create an admin user
-- Replace 'your-email@company.com' and 'Your Full Name' with actual values

-- First, create the app user (you'll need to create the auth account manually in Supabase Auth)
INSERT INTO app_user (email, display_name, department) 
VALUES ('your-email@company.com', 'Your Full Name', 'Administration')
ON CONFLICT (email) DO NOTHING;

-- Assign admin role to the user
INSERT INTO user_role (user_id, role_id) 
SELECT 
    u.user_id,
    r.role_id
FROM app_user u
CROSS JOIN role r
WHERE u.email = 'your-email@company.com' 
  AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Optional: Also assign editor role (admins usually have all permissions)
INSERT INTO user_role (user_id, role_id) 
SELECT 
    u.user_id,
    r.role_id
FROM app_user u
CROSS JOIN role r
WHERE u.email = 'your-email@company.com' 
  AND r.name = 'editor'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Verify the user was created with admin role
SELECT 
    u.email,
    u.display_name,
    array_agg(r.name) as roles
FROM app_user u
JOIN user_role ur ON u.user_id = ur.user_id
JOIN role r ON ur.role_id = r.role_id
WHERE u.email = 'your-email@company.com'
GROUP BY u.user_id, u.email, u.display_name;
