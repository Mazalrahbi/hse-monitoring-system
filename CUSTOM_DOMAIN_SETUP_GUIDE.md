# Custom Domain Setup Guide: datara.digital

## 🌐 Setting Up datara.digital for Your HSE Monitoring System

### Step 1: Configure Domain in Vercel Dashboard

1. **Go to your Vercel Dashboard:**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Find your `hse-monitoring-system` project
   - Click on it to open project settings

2. **Add Custom Domain:**
   - Go to **Settings** tab → **Domains** section
   - Click **"Add Domain"**
   - Enter: `datara.digital`
   - Click **"Add"**

3. **Configure Additional Domains (Recommended):**
   - Add `www.datara.digital` (redirects to main domain)
   - This ensures both www and non-www versions work

### Step 2: Configure DNS Records with Your Domain Registrar

You'll need to add these DNS records where you bought `datara.digital`:

#### **Primary Domain (datara.digital)**
```
Type: A
Name: @ (or leave blank)
Value: 76.76.19.61
TTL: 300 (or Auto)
```

#### **WWW Subdomain (www.datara.digital)**
```
Type: CNAME  
Name: www
Value: cname.vercel-dns.com
TTL: 300 (or Auto)
```

### Step 3: Domain Registrar Specific Instructions

#### **If you bought from GoDaddy:**
1. Login to [GoDaddy.com](https://godaddy.com)
2. Go to **My Products** → **DNS Management**
3. Find `datara.digital` → Click **DNS**
4. **Delete existing A records** pointing to parking pages
5. **Add the records above**

#### **If you bought from Namecheap:**
1. Login to [Namecheap.com](https://namecheap.com)  
2. Go to **Domain List** → **Manage** next to datara.digital
3. Go to **Advanced DNS** tab
4. **Delete existing A records**
5. **Add the records above**

#### **If you bought from Cloudflare:**
1. Login to [Cloudflare.com](https://cloudflare.com)
2. Select `datara.digital` domain
3. Go to **DNS** tab
4. **Add the records above**
5. Make sure **Proxy status is OFF** (gray cloud, not orange)

#### **Generic Instructions (Any Registrar):**
1. Login to your domain registrar's control panel
2. Find **DNS Management** or **DNS Records** section
3. Delete any existing A records (usually pointing to parking pages)
4. Add the A and CNAME records shown above

### Step 4: Verify Configuration

**In Vercel Dashboard:**
1. Go back to your project **Settings** → **Domains**
2. You should see `datara.digital` with a **green checkmark** ✅
3. If you see a red X ❌, click **"Refresh"** and wait a few minutes

**Expected Timeline:**
- **DNS propagation:** 5-30 minutes (can take up to 48 hours max)
- **SSL certificate:** Automatically generated within 24 hours
- **Status:** Domain shows as "Valid" with green checkmark

### Step 5: Test Your Custom Domain

Once setup is complete:

1. **Visit:** https://datara.digital
2. **Verify:** Your HSE Monitoring System loads
3. **Test redirect:** https://www.datara.digital should redirect to main domain
4. **Check SSL:** Look for the 🔒 lock icon in browser address bar

### Step 6: Update Environment Variables (If Needed)

If your Supabase configuration has CORS restrictions:

1. **Go to your Supabase Dashboard**
2. **Settings** → **API**  
3. **Add** `https://datara.digital` to allowed origins
4. **Add** `https://www.datara.digital` (if using www)

### Troubleshooting Common Issues

#### **Domain shows "Invalid" in Vercel:**
- **Wait 30 minutes** for DNS propagation
- **Check DNS records** are entered correctly  
- **Refresh** the domain status in Vercel
- **Use DNS checker:** [whatsmydns.net](https://whatsmydns.net)

#### **"This site can't be reached" error:**
- **DNS not propagated yet** - wait longer
- **Wrong DNS records** - double-check A record value
- **Clear browser cache** or try incognito mode

#### **SSL Certificate not working:**
- **Wait 24 hours** for automatic SSL generation
- **Domain must be valid** in Vercel first
- **Check** that A record points to correct IP

#### **Site loads but looks broken:**
- **Check environment variables** in Vercel are set
- **Verify Supabase CORS** settings include your domain
- **Check browser console** for errors

### Step 7: Optional Subdomain Setup

You can also create subdomains like:
- `app.datara.digital` (main application)
- `api.datara.digital` (if you have API endpoints)  
- `admin.datara.digital` (admin interface)

**To add subdomains:**
1. **In Vercel:** Add domain `app.datara.digital`
2. **In DNS:** Add CNAME record:
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```

### Final Result

✅ **Your HSE Monitoring System will be accessible at:**
- **https://datara.digital** (main domain)
- **https://www.datara.digital** (redirects to main)
- **Automatic HTTPS** with SSL certificate
- **Professional branding** with your custom domain

### Support Resources

- **Vercel Domains Docs:** https://vercel.com/docs/projects/domains
- **DNS Propagation Checker:** https://whatsmydns.net
- **SSL Test:** https://www.ssllabs.com/ssltest/

---

🎉 **Congratulations!** Your HSE Monitoring System will be live at **datara.digital** once DNS propagates!
