# Email Notification Setup Guide for HSE Monitoring System

## Overview

This guide explains how to implement email notifications for KPI changes in the HSE Monitoring System using the current architecture. The system will notify relevant users when KPIs are updated, status changes occur, or specific thresholds are reached.

## Architecture Integration

### Current System Components
Your HSE Monitoring System currently uses:
- **Next.js Frontend**: React components for UI
- **Supabase Backend**: PostgreSQL database with real-time subscriptions
- **Supabase Auth**: User authentication and management
- **Row-Level Security (RLS)**: Data access control

### New Components Needed
To add email notifications, you'll need:
1. **Supabase Edge Functions**: Serverless functions to handle email sending
2. **Email Service Provider**: Third-party service for sending emails
3. **Database Tables**: Store notification preferences and logs
4. **Database Triggers**: Automatically trigger notifications on data changes

---

## Step 1: Choose Email Service Provider

### Recommended Options

#### Option A: Resend (Recommended)
- **Why**: Modern API, great developer experience, generous free tier
- **Free Tier**: 3,000 emails/month, 100 emails/day
- **Setup**: Simple API key authentication
- **Website**: https://resend.com

#### Option B: SendGrid
- **Why**: Enterprise-grade, reliable, extensive features
- **Free Tier**: 100 emails/day
- **Setup**: API key + sender verification
- **Website**: https://sendgrid.com

#### Option C: AWS SES (Simple Email Service)
- **Why**: Cost-effective for high volume, integrates with AWS
- **Free Tier**: 62,000 emails/month (if hosted on AWS)
- **Setup**: AWS account + IAM credentials
- **Website**: https://aws.amazon.com/ses

### What You'll Need
1. Create an account with chosen provider
2. Verify your domain (for production)
3. Get API key/credentials
4. Store credentials in Supabase secrets

---

## Step 2: Database Schema Changes

### New Tables to Create

#### 1. notification_preferences
Stores user preferences for which notifications they want to receive.

**Purpose**: Allow users to control what emails they receive

**Fields Needed**:
- `preference_id` (UUID, primary key)
- `user_id` (UUID, foreign key to app_user)
- `notification_type` (text: 'kpi_update', 'status_change', 'threshold_alert', etc.)
- `enabled` (boolean)
- `frequency` (text: 'immediate', 'daily_digest', 'weekly_digest')
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Default Settings**: All notification types enabled with 'immediate' frequency

#### 2. notification_queue
Temporary storage for notifications before they're sent.

**Purpose**: Queue notifications and batch them for digest emails

**Fields Needed**:
- `queue_id` (UUID, primary key)
- `user_id` (UUID, foreign key to app_user)
- `notification_type` (text)
- `subject` (text)
- `body` (text)
- `data` (jsonb: contains KPI details)
- `status` (text: 'pending', 'sent', 'failed')
- `scheduled_for` (timestamp)
- `sent_at` (timestamp, nullable)
- `created_at` (timestamp)

#### 3. notification_log
Historical record of all sent notifications.

**Purpose**: Audit trail and troubleshooting

**Fields Needed**:
- `log_id` (UUID, primary key)
- `user_id` (UUID, foreign key to app_user)
- `notification_type` (text)
- `recipient_email` (text)
- `subject` (text)
- `status` (text: 'sent', 'failed', 'bounced')
- `error_message` (text, nullable)
- `sent_at` (timestamp)
- `created_at` (timestamp)

#### 4. notification_templates
Email templates for different notification types.

**Purpose**: Centralized email content management

**Fields Needed**:
- `template_id` (UUID, primary key)
- `template_name` (text)
- `subject_template` (text: with placeholders like {{kpi_name}})
- `body_template` (text: HTML email template)
- `variables` (jsonb: list of required variables)
- `is_active` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

---

## Step 3: Database Triggers

### When to Send Notifications

Create PostgreSQL triggers that fire when:

1. **KPI Value Changes**
   - Trigger on `kpi_value` INSERT or UPDATE
   - Check if numeric_value or text_value changed
   - Create notification_queue entry

2. **Status Changes**
   - Trigger on `kpi_value` UPDATE when status field changes
   - Especially important for: 'blocked', 'needs_review', 'done'
   - Create notification_queue entry

3. **Threshold Alerts**
   - Trigger when KPI value exceeds defined threshold
   - Check against target values in `kpi` table
   - Create notification_queue entry with high priority

4. **Assignment Changes**
   - Trigger when KPI owner_user_id changes
   - Notify both old and new owner
   - Create notification_queue entry

### Trigger Logic
Each trigger should:
1. Check user notification preferences
2. Determine recipients (owner, managers, subscribers)
3. Create entries in notification_queue
4. Set appropriate scheduled_for time based on frequency preference

---

## Step 4: Supabase Edge Functions Setup

### What Are Edge Functions?
Serverless functions that run on Supabase infrastructure, perfect for:
- Sending emails
- Processing notification queue
- Scheduled tasks (digest emails)

### Functions You'll Need

#### Function 1: send-immediate-notification
**Purpose**: Send immediate email notifications
**Trigger**: Called by database trigger or API
**Frequency**: On-demand (when KPI changes occur)

**What it does**:
1. Receives notification data from queue
2. Fetches user email and preferences
3. Loads appropriate email template
4. Populates template with KPI data
5. Calls email service API
6. Updates notification_queue status
7. Logs result in notification_log

#### Function 2: process-digest-emails
**Purpose**: Send daily/weekly digest emails
**Trigger**: Scheduled cron job (runs daily at 8 AM)
**Frequency**: Daily at scheduled time

**What it does**:
1. Queries notification_queue for pending digest items
2. Groups by user_id and frequency type
3. Compiles multiple notifications into single email
4. Sends consolidated digest
5. Updates queue status
6. Logs results

#### Function 3: send-threshold-alert
**Purpose**: Send urgent threshold violation alerts
**Trigger**: Called by database trigger
**Frequency**: Immediate (high priority)

**What it does**:
1. Identifies threshold violations
2. Sends to relevant stakeholders (owners + managers)
3. Includes direct link to KPI in system
4. Marks as high priority
5. Logs alert

---

## Step 5: Supabase Configuration

### Enable Edge Functions

1. **In Supabase Dashboard**:
   - Go to Edge Functions section
   - Enable Edge Functions for your project
   - Note your project URL and service role key

2. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

3. **Initialize Functions**:
   ```bash
   supabase functions new send-immediate-notification
   supabase functions new process-digest-emails
   supabase functions new send-threshold-alert
   ```

### Set Up Secrets

Store sensitive credentials securely:

1. **Email Service API Key**:
   ```bash
   supabase secrets set EMAIL_API_KEY=your_api_key_here
   ```

2. **Email Service Configuration**:
   ```bash
   supabase secrets set EMAIL_FROM_ADDRESS=noreply@yourdomain.com
   supabase secrets set EMAIL_FROM_NAME="HSE Monitoring System"
   ```

3. **Application URL** (for email links):
   ```bash
   supabase secrets set APP_URL=https://your-app-domain.com
   ```

---

## Step 6: Email Templates

### Template Structure

Create HTML email templates with:
- Professional header with company logo
- Clear subject line with notification type
- Structured content showing:
  - What changed (KPI name, section)
  - Who made the change (user name)
  - When it changed (timestamp)
  - Old value vs new value
  - Current status
- Call-to-action button (View KPI in System)
- Footer with notification preferences link

### Template Types Needed

1. **KPI Value Update**
   - Subject: "KPI Updated: {{kpi_name}}"
   - Shows old vs new value comparison
   - Links to specific KPI

2. **Status Change**
   - Subject: "KPI Status Changed: {{kpi_name}} is now {{new_status}}"
   - Highlights status progression
   - Shows who changed it

3. **Threshold Alert**
   - Subject: "⚠️ ALERT: {{kpi_name}} exceeded threshold"
   - Shows threshold value vs actual value
   - Marked as urgent/high priority

4. **Assignment Notification**
   - Subject: "You've been assigned: {{kpi_name}}"
   - Welcomes new owner
   - Provides context and resources

5. **Daily Digest**
   - Subject: "Your Daily HSE KPI Summary - {{date}}"
   - Lists all changes in past 24 hours
   - Grouped by section
   - Summary statistics

6. **Weekly Digest**
   - Subject: "Weekly HSE Performance Summary - Week of {{date}}"
   - Aggregated statistics
   - Top changes and alerts
   - Progress overview

---

## Step 7: Frontend Integration

### User Settings Page

Add a "Notifications" section to the existing SettingsPage component:

**What Users Can Configure**:
1. **Notification Types**: Toggle each notification type on/off
2. **Delivery Frequency**: Choose immediate, daily digest, or weekly digest
3. **Specific KPIs**: Subscribe to specific KPIs they want to monitor
4. **Email Address**: Verify/update email for notifications
5. **Quiet Hours**: Set times when not to receive notifications

**UI Components Needed**:
- Toggle switches for each notification type
- Dropdown for frequency selection
- Multi-select for KPI subscriptions
- Email input with verification
- Time picker for quiet hours

### Admin Configuration

Add notification management to AdminPanel:

**Admin Capabilities**:
1. View notification statistics (sent, failed, pending)
2. Manually trigger notifications for testing
3. Edit email templates
4. View notification logs and troubleshoot failures
5. Set system-wide notification rules
6. Disable notifications globally (maintenance mode)

---

## Step 8: Environment Variables

### Add to .env.local

```plaintext
# Email Service Configuration
EMAIL_SERVICE_PROVIDER=resend  # or sendgrid, ses
EMAIL_API_KEY=your_api_key_here
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=HSE Monitoring System

# Supabase Edge Functions
SUPABASE_FUNCTION_URL=https://your-project.supabase.co/functions/v1
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-app-domain.com
NOTIFICATION_BATCH_SIZE=50
DIGEST_SEND_TIME=08:00  # 8 AM daily
```

---

## Step 9: Notification Recipients Logic

### Who Gets Notified?

#### For KPI Updates:
1. **KPI Owner** (owner_user_id in kpi table)
2. **Users with Editor/Admin role** (optional, configurable)
3. **Users who subscribed to specific KPI** (from notification_preferences)
4. **Section managers** (if defined in organization structure)

#### For Status Changes:
1. **KPI Owner** (always)
2. **Contract Manager** (when status becomes 'blocked' or 'needs_review')
3. **HSE Manager** (when status becomes 'done')
4. **Subscribers** (users watching this KPI)

#### For Threshold Alerts:
1. **KPI Owner** (always)
2. **HSE Manager** (always, high priority)
3. **Contract Manager** (always, high priority)
4. **Admin Users** (configurable)

### Recipient Determination Flow
1. Check notification_preferences for user
2. Verify user email exists and is verified
3. Check user's role permissions
4. Apply frequency preferences (immediate vs digest)
5. Respect quiet hours if set
6. Add to notification_queue with appropriate priority

---

## Step 10: Scheduled Tasks

### Set Up Cron Jobs

Use Supabase's built-in cron functionality:

#### Daily Digest (8:00 AM daily)
```sql
-- In Supabase SQL Editor
SELECT cron.schedule(
  'process-daily-digests',
  '0 8 * * *',  -- 8 AM every day
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/process-digest-emails',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{"digest_type": "daily"}'::jsonb
  ) as request_id;
  $$
);
```

#### Weekly Digest (Monday 8:00 AM)
```sql
SELECT cron.schedule(
  'process-weekly-digests',
  '0 8 * * 1',  -- 8 AM every Monday
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/process-digest-emails',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{"digest_type": "weekly"}'::jsonb
  ) as request_id;
  $$
);
```

#### Cleanup Old Notifications (Daily)
```sql
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 2 * * *',  -- 2 AM every day
  $$
  DELETE FROM notification_queue 
  WHERE status = 'sent' 
  AND sent_at < NOW() - INTERVAL '30 days';
  $$
);
```

---

## Step 11: Testing Strategy

### Development Testing

1. **Unit Tests**:
   - Test notification_preferences CRUD
   - Test email template rendering
   - Test recipient determination logic
   - Test queue processing

2. **Integration Tests**:
   - Test database triggers fire correctly
   - Test Edge Functions execute successfully
   - Test email service connection
   - Test end-to-end notification flow

3. **Manual Testing**:
   - Update a KPI value → verify email sent
   - Change KPI status → verify correct recipients
   - Test digest compilation → verify grouping
   - Test notification preferences → verify respected

### Production Monitoring

**What to Monitor**:
1. Notification queue size (should stay low)
2. Failed notification rate (should be < 1%)
3. Email bounce rate (should be < 5%)
4. Processing time (should be < 5 seconds per email)
5. User opt-out rate (monitor to improve content)

**Set Up Alerts**:
- Alert if queue size > 1000 (bottleneck)
- Alert if failure rate > 5% (service issue)
- Alert if Edge Function errors spike

---

## Step 12: Migration Path

### Phased Rollout

#### Phase 1: Infrastructure (Week 1)
- [ ] Create database tables
- [ ] Set up email service provider account
- [ ] Configure Supabase Edge Functions
- [ ] Create basic email templates

#### Phase 2: Core Functionality (Week 2)
- [ ] Implement immediate notifications
- [ ] Create database triggers
- [ ] Test with small user group
- [ ] Monitor and fix issues

#### Phase 3: Digest Emails (Week 3)
- [ ] Implement digest compilation logic
- [ ] Set up cron jobs
- [ ] Create digest templates
- [ ] Test scheduling

#### Phase 4: User Controls (Week 4)
- [ ] Add notification settings to UI
- [ ] Implement preference management
- [ ] Add subscription features
- [ ] User acceptance testing

#### Phase 5: Full Launch (Week 5)
- [ ] Roll out to all users
- [ ] Monitor performance
- [ ] Collect feedback
- [ ] Iterate on templates and logic

---

## Step 13: Cost Considerations

### Email Service Costs

#### With Resend (Recommended for Start)
- **Free Tier**: 3,000 emails/month, 100/day
- **Pro Plan**: $20/month for 50,000 emails
- **Estimated Usage**: 
  - 50 users × 10 notifications/day = 500 emails/day
  - ~15,000 emails/month
  - **Recommended**: Pro Plan ($20/month)

#### With SendGrid
- **Free Tier**: 100 emails/day (not enough)
- **Essentials Plan**: $15/month for 50,000 emails
- **Good alternative if scaling up**

#### With AWS SES
- **Cost**: $0.10 per 1,000 emails
- **For 15,000/month**: ~$1.50/month
- **Most cost-effective at scale**
- **Requires more setup effort**

### Supabase Edge Functions
- **Free Tier**: 500,000 invocations/month
- **More than sufficient** for notification use case
- No additional cost expected

---

## Step 14: Security Considerations

### Email Security

1. **Verify Sender Domain**:
   - Add SPF, DKIM, DMARC records
   - Prevents emails going to spam
   - Required for production

2. **Protect API Keys**:
   - Never commit keys to Git
   - Use Supabase secrets
   - Rotate keys quarterly

3. **Validate Email Addresses**:
   - Verify before sending
   - Use Supabase Auth email verification
   - Handle bounces gracefully

### Data Privacy

1. **User Consent**:
   - Opt-in by default
   - Easy opt-out mechanism
   - Clear privacy policy

2. **Data Minimization**:
   - Only send necessary information
   - Don't include sensitive data in emails
   - Use links to view full details

3. **Compliance**:
   - GDPR compliance (if applicable)
   - Allow data export
   - Honor deletion requests

---

## Step 15: Best Practices

### Email Content

1. **Clear and Concise**:
   - Use plain language
   - Highlight key information
   - Include direct action items

2. **Mobile-Friendly**:
   - Responsive email templates
   - Test on multiple devices
   - Keep buttons large and tappable

3. **Actionable**:
   - Include "View KPI" button
   - Link to relevant section
   - Show what action is needed

### User Experience

1. **Frequency Control**:
   - Never spam users
   - Respect digest preferences
   - Allow granular control

2. **Personalization**:
   - Use user's name
   - Show only relevant KPIs
   - Context-aware content

3. **Feedback Loop**:
   - "Was this useful?" link
   - Easy unsubscribe
   - Preference management

### Technical

1. **Error Handling**:
   - Retry failed sends (max 3 times)
   - Log all failures
   - Alert on patterns

2. **Performance**:
   - Batch process when possible
   - Use queue for async processing
   - Monitor execution time

3. **Monitoring**:
   - Track delivery rates
   - Monitor user engagement
   - Analyze notification effectiveness

---

## Quick Start Checklist

- [ ] Choose email service provider (Resend recommended)
- [ ] Create email service account and get API key
- [ ] Create new database tables (notification_preferences, etc.)
- [ ] Set up Supabase Edge Functions environment
- [ ] Store email API key in Supabase secrets
- [ ] Create email templates in database
- [ ] Write database triggers for KPI changes
- [ ] Implement send-immediate-notification Edge Function
- [ ] Add notification settings to frontend SettingsPage
- [ ] Test with sample KPI update
- [ ] Implement digest email Edge Function
- [ ] Set up cron jobs for scheduled sends
- [ ] Test end-to-end flow with real users
- [ ] Monitor and optimize based on usage

---

## Support and Resources

### Documentation
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Resend API Docs**: https://resend.com/docs
- **SendGrid API Docs**: https://docs.sendgrid.com
- **AWS SES Docs**: https://docs.aws.amazon.com/ses

### Troubleshooting
- Check Supabase Edge Function logs for errors
- Verify email service API key is correct
- Confirm database triggers are enabled
- Test email delivery with test addresses
- Check notification_log for failed sends

### Getting Help
- Supabase Discord: https://discord.supabase.com
- Email service provider support
- HSE System admin panel logs

---

## Future Enhancements

### Potential Features
1. **SMS Notifications** (for critical alerts)
2. **In-App Notifications** (browser notifications)
3. **Slack/Teams Integration** (webhook notifications)
4. **Custom Notification Rules** (advanced filtering)
5. **Notification Analytics Dashboard** (engagement metrics)
6. **A/B Testing Email Templates** (optimize engagement)
7. **Multi-Language Support** (localized emails)
8. **Smart Notification Timing** (ML-based send time optimization)

---

This guide provides a comprehensive roadmap for implementing email notifications. Start with immediate notifications (Steps 1-6), then expand to digests and advanced features.
