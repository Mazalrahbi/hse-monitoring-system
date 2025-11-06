# GitHub Actions Email Automation Setup

## ✅ Files Created

1. **API Route**: `src/app/api/cron/send-emails/route.ts`
2. **GitHub Action**: `.github/workflows/send-email-notifications.yml`

---

## 🔧 Setup Instructions

### Step 1: Add Environment Variables Locally

Add to your `.env.local` file:

```env
# Existing variables
NEXT_PUBLIC_SUPABASE_URL=https://ksgoinbgtcnlxlitvedz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# New variables needed
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_random_secret_here
```

**To generate CRON_SECRET**:
```bash
openssl rand -hex 32
```

Or use any random string like: `my-super-secret-cron-key-12345`

---

### Step 2: Deploy to Vercel

1. **Push code to GitHub**:
```bash
git add .
git commit -m "Add GitHub Actions email automation"
git push origin main
```

2. **Go to Vercel Dashboard** (https://vercel.com)

3. **Add Environment Variables**:
   - Project Settings → Environment Variables
   - Add:
     - `SUPABASE_SERVICE_ROLE_KEY` = (from Supabase Dashboard → Settings → API)
     - `CRON_SECRET` = (your generated secret)
   
4. **Redeploy** (Vercel will redeploy automatically)

---

### Step 3: Add GitHub Secrets

1. **Go to GitHub Repository**:
   - https://github.com/Mazalrahbi/hse-monitoring-system

2. **Navigate to**:
   - Settings → Secrets and variables → Actions

3. **Add Repository Secrets**:

| Secret Name | Value |
|-------------|-------|
| `APP_URL` | Your Vercel URL (e.g., `https://your-app.vercel.app`) |
| `CRON_SECRET` | Same secret you used in Vercel |

---

### Step 4: Enable GitHub Actions

1. **Go to your repo** → **Actions** tab

2. If prompted, **enable Actions** for the repository

3. You should see the workflow: **"Send Email Notifications"**

---

### Step 5: Test It

#### Test the API Route Locally:

```bash
# Start dev server
npm run dev

# In another terminal, test the endpoint
curl -X GET http://localhost:3000/api/cron/send-emails \
  -H "x-cron-secret: your_secret_here"
```

**Expected response**:
```json
{
  "success": true,
  "processed": 1,
  "queueId": "some-uuid"
}
```

#### Test GitHub Action Manually:

1. Go to **Actions** tab in GitHub
2. Click **"Send Email Notifications"**
3. Click **"Run workflow"** → **"Run workflow"**
4. Watch it run (takes ~10 seconds)
5. Check workflow logs

---

## 🎯 How It Works

1. **GitHub Action runs every minute** (cron: '* * * * *')
2. **Calls your API route** at `/api/cron/send-emails`
3. **API route**:
   - Verifies secret
   - Gets 1 pending notification
   - Calls Supabase Edge Function
   - Edge Function sends email via Resend
4. **Repeat every minute** until queue is empty

---

## 🔍 Monitoring

### Check GitHub Actions

- Go to **Actions** tab
- See all workflow runs
- Click any run to see logs

### Check Logs in Vercel

- Vercel Dashboard → Your Project → Logs
- Filter by `/api/cron/send-emails`

### Check Database

```sql
-- See pending notifications
SELECT COUNT(*) FROM notification_queue WHERE status = 'pending';

-- See sent notifications
SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT 10;
```

---

## ⚙️ Configuration

### Change Frequency

Edit `.github/workflows/send-email-notifications.yml`:

```yaml
schedule:
  - cron: '*/5 * * * *'  # Every 5 minutes
  - cron: '0 * * * *'    # Every hour
  - cron: '0 0 * * *'    # Every day at midnight
```

### Process Multiple Emails

Edit `src/app/api/cron/send-emails/route.ts`:

```typescript
// Change limit from 1 to 3 (respects Resend rate limit)
.limit(3);

// Add delay between sends
for (const notification of notifications) {
  await supabase.functions.invoke(...);
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
}
```

---

## 🎉 Benefits

✅ **100% Free** - GitHub Actions free tier: 2,000 minutes/month
✅ **Reliable** - Runs even if your computer is off
✅ **Automatic** - Set it and forget it
✅ **Scalable** - Handles any queue size
✅ **Monitored** - See all runs in GitHub Actions

---

## 🐛 Troubleshooting

### GitHub Action fails with 401

- Check `CRON_SECRET` matches in Vercel and GitHub
- Check `APP_URL` is correct (no trailing slash)

### API returns "No pending notifications"

- Good! Queue is empty
- Create a KPI change to test

### Emails not sending

1. Check Supabase Edge Function has `RESEND_API_KEY`
2. Check notification_queue has pending items
3. Check Vercel logs for errors

---

## 📞 Support

If something doesn't work:
1. Check GitHub Actions logs
2. Check Vercel function logs
3. Check browser console (Network tab)

---

**Your automatic email system is now set up with GitHub Actions!** 🚀
