# ✅ Deployment Checklist

## Before Deployment

### 1. **Get Your Deployment URL**
First, deploy to your platform to get the URL:
- **Railway**: `https://your-app.up.railway.app`
- **Render**: `https://your-app.onrender.com`
- **Vercel**: `https://your-app.vercel.app`
- **Custom Domain**: `https://api.yourdomain.com`

### 2. **Update Google OAuth Console**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Navigate to: **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, add:
   ```
   https://your-actual-deployment-url/auth/google/callback
   ```
6. Click **Save**

### 3. **Set Environment Variables on Deployment Platform**

**Required Variables:**
```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
NODE_ENV=production

# JWT (generate new: openssl rand -base64 32)
JWT_SECRET=your-32-char-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://your-deployment-url/auth/google/callback

# Paystack (LIVE keys for production)
PAYSTACK_SECRET_KEY=sk_live_your-live-key

# App
PORT=3000
FRONTEND_URL=https://your-frontend-url.com
```

### 4. **Configure Paystack Webhook**

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to: **Settings** → **Webhooks**
3. Add webhook URL:
   ```
   https://your-deployment-url/wallet/paystack/webhook
   ```
4. Click **Save**

### 5. **Run Database Migration**

**Option A: Via deployment platform terminal**
```bash
NODE_ENV=production pnpm migration:run
```

**Option B: Locally against production DB**
```bash
DATABASE_URL="your-neon-url" NODE_ENV=production pnpm migration:run
```

### 6. **Test Deployment**

```bash
# 1. Health check
curl https://your-deployment-url/health

# 2. Check Swagger docs
open https://your-deployment-url/api

# 3. Test Google OAuth
open https://your-deployment-url/auth/google
```

## Platform-Specific Setup

### Railway

1. **Connect GitHub repo**
2. **Add environment variables** in Variables tab
3. **Deploy** - Railway auto-detects Node.js
4. **Get deployment URL** from Settings → Domains
5. **Update Google OAuth** with Railway URL
6. **Run migrations** via Railway terminal

### Render

1. **Create New Web Service**
2. **Connect GitHub repo**
3. **Configure:**
   - Build Command: `pnpm install && pnpm run build`
   - Start Command: `node dist/main`
4. **Add environment variables**
5. **Get deployment URL** from dashboard
6. **Update Google OAuth** with Render URL
7. **Run migrations** via Render shell

### Vercel (Not Recommended)
This app needs persistent connections - use Railway or Render instead.

## Common Issues & Solutions

### ❌ "Redirect URI mismatch"
**Solution**: Your `GOOGLE_CALLBACK_URL` doesn't match what's in Google Console
1. Check your deployment URL
2. Update Google Console with exact URL
3. Update `GOOGLE_CALLBACK_URL` env var
4. Redeploy

### ❌ "Database connection failed"
**Solution**: Check SSL settings
1. Ensure `DATABASE_URL` has `?sslmode=require`
2. Verify Neon database is active
3. Check if your IP is whitelisted (Neon allows all by default)

### ❌ "Migrations not running"
**Solution**: Run migrations manually
```bash
# Get shell access on your platform
NODE_ENV=production pnpm migration:run
```

### ❌ "Paystack webhook not working"
**Solution**: 
1. Check webhook URL in Paystack dashboard
2. Ensure URL is `https://` not `http://`
3. Test with manual verification: `/wallet/deposit/:reference/verify`

## Post-Deployment Verification

- [ ] Health endpoint returns 200: `/health`
- [ ] Swagger docs accessible: `/api`
- [ ] Google OAuth redirects properly: `/auth/google`
- [ ] Can create API key after login
- [ ] Database tables exist (check Neon console)
- [ ] Migrations ran successfully
- [ ] Paystack webhook configured
- [ ] Frontend can connect to API

## Quick Commands

```bash
# Test health
curl https://your-url/health

# Test database connection (local)
DATABASE_URL="your-neon-url" node -e "const {AppDataSource}=require('./dist/data-source');AppDataSource.initialize().then(()=>console.log('Connected!')).catch(e=>console.error(e))"

# Generate production JWT secret
openssl rand -base64 32

# Check migration status
DATABASE_URL="your-neon-url" NODE_ENV=production pnpm migration:show
```

## Environment Variable Template

Copy this and fill in your values:

```bash
DATABASE_URL=
NODE_ENV=production
JWT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
PAYSTACK_SECRET_KEY=
PORT=3000
FRONTEND_URL=
```
