# User Roles & Account Creation Guide

## Available Roles

The HSE Monitoring System has 4 different user roles:

| Role | Badge Color | Permissions |
|------|-------------|-------------|
| **Admin** | 🔴 Red | Full system access, user management, audit trails, system settings |
| **Editor** | 🔵 Blue | Can edit KPIs, change values, upload evidence, view analytics |
| **Viewer** | ⚪ Gray | Read-only access to KPIs and analytics |
| **Auditor** | ⚪ Gray | Read access + audit trail viewing and export |

## How to Create Accounts with Different Roles

### Method 1: Use Demo Accounts (Quickest)

Pre-configured demo accounts are available (if passwords are set in Supabase Auth):

- **Admin**: `admin@bgis.com` 
- **Editor**: `hse.manager@bgis.com`
- **Editor**: `contract.manager@bgis.com`

### Method 2: Register New Account (Automatic Viewer Role)

1. Go to the application login page
2. Click "Create Account" tab
3. Fill in email, password, and full name
4. New users automatically get **Viewer** role
5. Admin can upgrade their role later

### Method 3: Admin Panel Management (Recommended)

1. Login as an Admin user
2. Click the "Admin" tab in the navigation
3. In the User Management section:
   - View all users and their current roles
   - Search and filter users
   - Change user roles using dropdown menus
   - Activate/deactivate user accounts

### Method 4: Database Script (Manual Admin Creation)

Use the provided script `scripts/create-admin-user.sql`:

1. Edit the script and replace placeholders:
   ```sql
   -- Replace these values:
   VALUES ('your-email@company.com', 'Your Full Name', 'Administration')
   WHERE u.email = 'your-email@company.com'
   ```

2. Run the script in your database:
   ```bash
   psql -h your-host -d your-database -f scripts/create-admin-user.sql
   ```

3. Create the auth account in Supabase Auth dashboard

## Role Permissions Details

### 🔴 Admin
- Full access to all features
- Can manage users and assign roles
- Can view complete audit trails
- Can manage system settings and templates
- Can export data and reports

### 🔵 Editor  
- Can edit KPI values and statuses
- Can upload evidence and attachments
- Can view analytics dashboards
- Can access personal settings
- Changes are logged in audit trail

### ⚪ Viewer
- Can view KPI grids (read-only)
- Can view analytics dashboards
- Can access personal settings
- Cannot modify any data

### ⚪ Auditor
- All Viewer permissions
- Can access audit trail reports
- Can export audit logs
- Can view change history

## Checking Your Role

Your role is displayed as a colored badge next to your name in the top-right corner of the application:

```
[Your Name]
[Department] [ADMIN] [EDITOR]
```

## First Admin Setup

For initial system setup:

1. **Option A**: Modify `scripts/create-admin-user.sql` with your details and run it
2. **Option B**: Register a regular account, then manually promote it to admin in the database:
   ```sql
   -- Get your user_id
   SELECT user_id FROM app_user WHERE email = 'your-email@company.com';
   
   -- Assign admin role
   INSERT INTO user_role (user_id, role_id) 
   VALUES ('your-user-id', (SELECT role_id FROM role WHERE name = 'admin'));
   ```

## Role Badge Colors

The system uses color-coded badges to quickly identify user roles:
- **🔴 Red Badge**: Admin (highest privileges)
- **🔵 Blue Badge**: Editor (can modify data) 
- **⚪ Gray Badge**: Viewer/Auditor (read-only)

Multiple roles can be assigned to one user, and all badges will be displayed.
