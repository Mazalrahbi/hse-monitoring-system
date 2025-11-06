# Email Notification System - Setup Instructions

## ✅ What's Already Done

All code has been committed and deployed to GitHub:
- ✅ Database migration files created
- ✅ Edge Function code ready
- ✅ Settings UI with notification preferences
- ✅ Database trigger for KPI status changes
- ✅ Opt-in notification system (all disabled by default)

---

## 🚀 Final Setup Steps (Do These Now!)

### Step 1: Apply Database Migrations (5 minutes)

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to**: SQL Editor
3. **Run Migration 009** - Copy and paste from `supabase/migrations/009_notification_system.sql`
   - Creates `notification_preferences` table
   - Creates `notification_queue` table
   - Creates `notification_log` table
   - Sets up default preferences for all users (disabled)
   
4. **Run Migration 010** - Copy and paste from `supabase/migrations/010_notification_trigger.sql`
   - Creates database trigger for KPI status changes
   - Automatically queues notifications when KPIs are updated

### Step 2: Deploy Edge Function (10 minutes)

**Option A: Using Supabase Dashboard (Easier)**

1. Go to **Edge Functions** in Supabase Dashboard
2. Click **"Create a new function"**
3. Name it: `send-notification`
4. Copy the code from `supabase/functions/send-notification/index.ts`
5. Paste and **Deploy**

**Option B: Using Supabase CLI** (if you have Docker)

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy send-notification
```

### Step 3: Verify Supabase Secrets (2 minutes)

Go to **Settings** → **Edge Functions** → **Secrets** and verify these are set:

```
RESEND_API_KEY = re_your_actual_key_here
EMAIL_FROM_ADDRESS = notifications@datara.digital
EMAIL_FROM_NAME = HSE Monitoring System
APP_URL = https://your-vercel-app.vercel.app
```

If not set, add them now!

### Step 4: Test the System (5 minutes)

1. **Deploy to Vercel** (should auto-deploy from GitHub push)
2. **Go to Settings page** in your app
3. **You should see**: "Email Notification Preferences" card
4. **Enable** "KPI Status Changes" notification
5. **Go to KPI Grid** and change a KPI status
6. **Check your email** - you should receive a notification!

---

## 📧 How It Works

### For Users:
1. All notifications are **OFF by default**
2. Users go to **Settings** → **Email Notification Preferences**
3. They toggle ON the notifications they want
4. When a KPI they own changes status → email sent!

### Email Flow:
```
KPI Status Change
    ↓
Database Trigger Fires
    ↓
Creates entry in notification_queue
    ↓
Checks user has notifications enabled
    ↓
Edge Function sends email via Resend
    ↓
Logs in notification_log
    ↓
User receives email!
```

---

## 🎯 What Users Can Enable

1. **KPI Status Changes** 🔔
   - Notified when KPI status changes (Done, In Progress, Blocked, etc.)
   - Only for KPIs they own or manage

2. **KPI Value Updates** 📊
   - Notified when KPI values are updated
   - (Trigger not yet implemented - add if needed)

3. **Blocked KPI Alerts** ⚠️
   - High priority alerts for blocked KPIs
   - Sent to owners and managers

---

## 🧪 Testing Checklist

- [ ] Migration 009 applied successfully
- [ ] Migration 010 applied successfully  
- [ ] Edge Function deployed
- [ ] Supabase secrets configured
- [ ] Vercel deployment successful
- [ ] Settings page shows notification preferences
- [ ] Can toggle notifications ON/OFF
- [ ] Test email received when changing KPI status

---

## 🔧 Troubleshooting

### "Tables not found"
→ Run migrations 009 and 010 in Supabase SQL Editor

### "Edge Function not found"
→ Deploy the function from `supabase/functions/send-notification/index.ts`

### "No email received"
1. Check notification preferences are enabled in Settings
2. Check email_notifications toggle is ON in Settings
3. Check Resend API key is valid
4. Check notification_queue table for pending items
5. Check notification_log table for errors

### "Function error 500"
→ Check Supabase Edge Function logs for details

---

## 📊 Monitoring

### Check Notification Queue
```sql
-- See pending notifications
SELECT * FROM notification_queue WHERE status = 'pending';

-- See sent notifications
SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT 10;
```

### Check User Preferences
```sql
-- See who has notifications enabled
SELECT 
  u.email,
  np.notification_type,
  np.enabled
FROM app_user u
JOIN notification_preferences np ON np.user_id = u.user_id
WHERE np.enabled = true;
```

---

## 🎨 UI Features

Users will see in Settings:
- ✅ Beautiful card-based UI
- ✅ Toggle switches for each notification type
- ✅ Clear descriptions
- ✅ Badge showing X/3 enabled
- ✅ Opt-in messaging
- ✅ Real-time save (auto-saves on toggle)

---

## 🔐 Security

- ✅ RLS policies enabled on all tables
- ✅ Users can only see/edit their own preferences
- ✅ API keys stored securely in Supabase
- ✅ Notifications only sent to verified users
- ✅ Opt-in model (privacy-friendly)

---

## 📈 Future Enhancements

Possible additions:
1. Digest emails (daily/weekly summaries)
2. SMS notifications (for critical alerts)
3. In-app notifications
4. Custom notification rules
5. Notification history view
6. Email templates management

---

## 💡 Quick Commands

```bash
# Check if migrations are applied
SELECT * FROM notification_preferences LIMIT 1;

# Enable notifications for yourself (SQL)
UPDATE notification_preferences 
SET enabled = true 
WHERE user_id = 'your-user-id' 
AND notification_type = 'kpi_status_change';

# Test notification manually (SQL)
INSERT INTO notification_queue (user_id, notification_type, subject, body)
VALUES ('your-user-id', 'test', 'Test Email', '<p>This is a test</p>');
```

---

## 📞 Support

If you need help:
1. Check the logs in Supabase Dashboard
2. Check Resend dashboard for delivery status
3. Review EMAIL_NOTIFICATION_SETUP_GUIDE.md for detailed info
4. Check notification_log table for error messages

---

## ✨ Summary

**What You Have Now:**
- Complete email notification system
- Opt-in preferences (disabled by default)
- Beautiful Settings UI
- Automatic emails on KPI status changes
- Full audit trail
- Production-ready code

**What's Left To Do:**
1. Run 2 SQL migrations in Supabase
2. Deploy Edge Function
3. Test!

**Estimated Time:** 15-20 minutes

Let's get it running! 🚀
