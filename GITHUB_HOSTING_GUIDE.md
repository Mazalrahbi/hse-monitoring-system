# GitHub Hosting Guide for HSE Monitoring System

## Step 1: Create a GitHub Repository

### Option A: Using GitHub Web Interface (Recommended)
1. Go to [GitHub.com](https://github.com) and sign in to your account
2. Click the **"+"** button in the top right corner
3. Select **"New repository"**
4. Fill out the repository details:
   - **Repository name**: `hse-monitoring-system`
   - **Description**: `Real-time collaborative HSE monitoring system with Excel-like interface`
   - **Visibility**: Choose **Public** (for free hosting) or **Private** (if you prefer)
   - ⚠️ **DO NOT** check "Add a README file" (we already have one)
   - ⚠️ **DO NOT** add .gitignore or license (we already have them)
5. Click **"Create repository"**

### Option B: Using GitHub CLI (if you have it installed)
```bash
gh repo create hse-monitoring-system --public --description "Real-time collaborative HSE monitoring system with Excel-like interface"
```

## Step 2: Connect Your Local Repository to GitHub

After creating the GitHub repository, you'll see a page with setup instructions. Copy the **HTTPS** URL (it will look like: `https://github.com/YOUR_USERNAME/hse-monitoring-system.git`)

Then run these commands in your terminal:

```bash
cd hse-monitoring-system

# Add the GitHub repository as the remote origin
git remote add origin https://github.com/YOUR_USERNAME/hse-monitoring-system.git

# Push your code to GitHub
git push -u origin main
```

## Step 3: Verify Upload

1. Refresh your GitHub repository page
2. You should see all your project files including:
   - `src/` folder with all components
   - `README.md` with project documentation
   - `package.json` with dependencies
   - Database migration scripts
   - Setup guides

## Deployment Options

### Option 1: Vercel (Recommended - Free & Easy)

1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click **"New Project"**
4. Select your `hse-monitoring-system` repository
5. Configure build settings:
   - **Framework**: Next.js (should be auto-detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
6. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
7. Click **"Deploy"**

Your app will be live at: `https://hse-monitoring-system-YOUR_USERNAME.vercel.app`

### Option 2: Netlify (Alternative)

1. Go to [netlify.com](https://netlify.com)
2. Sign in with GitHub
3. Click **"New site from Git"**
4. Choose your repository
5. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
6. Add the same environment variables as above
7. Deploy

### Option 3: GitHub Pages (Static hosting only)

For static hosting without server-side features:

1. In your repository, go to **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / **(root)**
4. Your site will be available at: `https://YOUR_USERNAME.github.io/hse-monitoring-system`

⚠️ **Note**: GitHub Pages only supports static sites, so server-side features won't work.

## Environment Variables Setup

For any hosting platform, you'll need these environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Security Considerations

### Important Files Excluded from GitHub:
- `.env.local` - Contains sensitive database credentials
- `node_modules/` - Dependencies (reinstalled during deployment)
- `.next/` - Build files (regenerated during deployment)

### Before Going Live:
1. **Database Security**: Ensure your Supabase RLS policies are properly configured
2. **Authentication**: Verify user roles and permissions work correctly
3. **Environment Variables**: Never commit sensitive keys to GitHub
4. **CORS Settings**: Configure your Supabase project's CORS settings for your domain

## Collaboration Features

Once hosted on GitHub, your team can:
- **Clone** the repository to contribute
- **Create branches** for new features
- **Submit pull requests** for code reviews
- **Track issues** and feature requests
- **Use GitHub Actions** for automated testing/deployment

## Maintenance Commands

Update your GitHub repository when you make changes:

```bash
# Check status
git status

# Add changes
git add .

# Commit with descriptive message
git commit -m "fix: improve user interface responsiveness"

# Push to GitHub
git push origin main
```

## Custom Domain (Optional)

To use your own domain:

1. **Purchase a domain** from any domain registrar
2. **Configure DNS**:
   - Add CNAME record pointing to your hosting platform
   - For Vercel: `your-domain.com → cname.vercel-dns.com`
3. **Update platform settings**:
   - Add custom domain in your hosting platform dashboard
   - Configure SSL certificate (usually automatic)

## Support

If you encounter issues:
1. Check the GitHub repository's Issues tab
2. Review deployment logs in your hosting platform
3. Verify environment variables are correctly set
4. Ensure Supabase project is accessible from your domain

---

🎉 **Congratulations!** Your HSE Monitoring System is now hosted on GitHub and ready for deployment!
