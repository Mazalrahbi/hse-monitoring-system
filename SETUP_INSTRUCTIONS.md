# 🚀 Complete Setup Instructions

Your HSE Monitoring System is ready! You just need to populate the database with data.

## 📊 **Step 1: Run Database Migration**

1. Go to your Supabase project: https://supabase.com/dashboard/project/ksgoinbgtcnlxlitvedz
2. Navigate to **SQL Editor** (left sidebar)
3. Create a new query
4. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
5. Click **Run** to create all tables

## 🎯 **Step 2: Populate HSE Data**

1. In the same SQL Editor, create another new query
2. Copy and paste the contents of `scripts/seed-hse-data.sql`
3. Click **Run** to populate with all HSE KPIs and sections

## 🔑 **Step 3: Update API Key**

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy your **anon/public** key
3. Update your `.env.local` file:
   ```
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_real_key_here
   SUPABASE_KEY=your_real_key_here
   ```

## ✅ **Expected Result**

After running the seed script, you should see:
- **9 HSE sections**: Safety Leadership, Worker Welfare, etc.
- **60+ KPIs** with proper numbering (1.1, 1.2, 2.1, etc.)
- **Sample data** for demonstration
- **Monthly tracking** for 2025

## 🎉 **You're Done!**

Refresh your browser and you'll see the complete HSE Monitoring Plan with all data loaded!
