# HSE Monitoring System

A comprehensive real-time collaborative HSE (Health, Safety, Environment) monitoring system built with Next.js, Supabase, and TypeScript. This system provides Excel-like grid editing, real-time collaboration, analytics, and audit trails for HSE KPI management.

## 🚀 Features

- **Real-time Collaborative Editing**: Multi-user editing with presence indicators and conflict-free updates
- **Excel-like Grid Interface**: Familiar spreadsheet-style interface matching the original HSE monitoring plan
- **Status Tracking**: Track KPI status (Not Started, In Progress, Done, Blocked, Needs Review)
- **Analytics Dashboard**: Visual insights and reports on HSE performance
- **Audit Trail**: Complete history of who changed what, when, and why
- **Role-based Access Control**: Admin, Editor, Viewer, and Auditor roles
- **Excel Export**: Generate pixel-perfect Excel files matching the original template
- **Evidence Management**: Upload and manage supporting documents
- **Mobile Responsive**: Works on desktop, tablet, and mobile devices

## 🏗️ Architecture

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, Radix UI
- **Backend**: Supabase (PostgreSQL + Real-time + Auth + Storage)
- **Real-time**: Supabase Realtime for live collaboration
- **Authentication**: Supabase Auth with row-level security
- **State Management**: React Context + Supabase subscriptions
- **UI Components**: Custom components built on Radix UI primitives

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Git

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd hse-monitoring-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your project URL and keys
3. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Set up the Database

#### Option A: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Run the migration
5. Copy and paste the contents of `scripts/seed-hse-data.sql`
6. Run the seed script

#### Option B: Using Supabase CLI (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db reset

# Run seed script
supabase db reset --linked
```

### 5. Start the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📊 Database Schema

The system uses a comprehensive database schema designed for HSE monitoring:

### Core Entities
- **org_site**: Sites/locations
- **section**: HSE sections (Safety Leadership, Worker Welfare, etc.)
- **kpi**: Key Performance Indicators
- **kpi_period**: Time periods (monthly, quarterly, yearly)
- **kpi_value**: Actual KPI values and status

### Security & Users
- **app_user**: Application users
- **role**: User roles (admin, editor, viewer, auditor)
- **user_role**: Role assignments
- **policy_scope**: Row-level permissions

### Collaboration & Audit
- **edit_session**: User editing sessions
- **change_set**: Complete audit trail
- **event_log**: System events
- **user_presence**: Real-time presence tracking

### Analytics
- **dim_date, dim_site, dim_section, dim_kpi**: Dimension tables
- **fact_kpi**: Fact table for analytics

## 🔐 Authentication & Security

- **Supabase Auth**: Handles user authentication
- **Row Level Security (RLS)**: Ensures users only see data they should
- **Role-based Access Control**: Four user roles with different permissions
- **Session Management**: Tracks user sessions for audit purposes
- **IP and User Agent Logging**: Complete audit trail

## 🎯 Usage

### Demo Users
The seed script creates demo users:
- `admin@bgis.com` - System Administrator
- `hse.manager@bgis.com` - HSE Manager
- `contract.manager@bgis.com` - Contract Manager

### Key Features

1. **KPI Grid**: Excel-like interface for viewing and editing HSE KPIs
2. **Status Management**: Click status dropdowns to update KPI status
3. **Value Editing**: Click cells to edit values inline
4. **Real-time Updates**: See changes from other users in real-time
5. **Evidence Upload**: Attach supporting documents to KPIs
6. **Analytics**: View performance dashboards and reports
7. **Audit Trail**: Complete history of all changes

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Manual Deployment
1. Build the application: `npm run build`
2. Deploy the `out` directory to your hosting platform
3. Ensure environment variables are set in production

## 🛠️ Development

### Project Structure
```
src/
├── app/                 # Next.js 14 app directory
├── components/
│   ├── auth/           # Authentication components
│   ├── grid/           # KPI grid components
│   └── ui/             # Reusable UI components
├── lib/
│   ├── supabase/       # Supabase client configuration
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
supabase/
├── migrations/         # Database migrations
└── seed-scripts/       # Data seeding scripts
```

### Key Components
- `KpiGrid`: Main grid component with editing capabilities
- `AuthProvider`: Authentication context provider
- `Badge, Button, Select`: UI components built on Radix UI

### Scripts
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection**: Ensure your Supabase URL and keys are correct
2. **RLS Policies**: Check that Row Level Security policies are properly configured
3. **Real-time**: Verify Realtime is enabled in your Supabase project

### Support

For issues and questions:
1. Check the [GitHub Issues](link-to-issues)
2. Review the [Supabase Documentation](https://supabase.com/docs)
3. Contact the development team

## 🔄 Roadmap

- [ ] Excel import/export functionality
- [ ] Advanced analytics dashboard  
- [ ] Mobile app (React Native)
- [ ] Workflow approvals
- [ ] Integration with external systems
- [ ] Advanced reporting and charts
- [ ] Notification system
- [ ] Bulk operations
- [ ] Data validation rules
- [ ] Custom fields and sections

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributors

- Your Team Name
- Contact: your-email@company.com

## 🙏 Acknowledgments

- Built for Black Gold Integrated Solution PDO Nimr
- Powered by Supabase and Next.js
- UI components from Radix UI and Tailwind CSS
