# Railway Deployment Guide

## Two Ways to Deploy

### Option 1: Via Railway Dashboard (Recommended)

**⚠️ CRITICAL: You MUST set the Root Directory!**

1. Connect your GitHub repository to Railway
2. **In Railway Dashboard:**
   - Go to **Settings** → **General** tab
   - Find **"Root Directory"** field
   - Type exactly: `backend` (no slashes, just the word)
   - Click **"Save Changes"**
   - **Redeploy** to apply changes
3. Railway will auto-detect the start command from backend's package.json
4. Add environment variables from `.env.example`

**Note:** The `railway.json` in the root also specifies this, but ensure the dashboard setting matches!

### Option 2: Using Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# From the backend directory
cd backend

# Initialize new Railway project
railway init

# Link to existing project (if you have one)
railway link

# Deploy
railway up
```

## Required Environment Variables

Copy these from `.env.example` and set in Railway:

- `NODE_ENV=production`
- `PORT` (Railway auto-sets this)
- `HOST=0.0.0.0`
- `GITHUB_TOKEN`
- `GITHUB_REPO`
- `GITHUB_OWNER`
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_NAME`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `PIPEDREAM_WEBHOOK_SECRET`

## Build Configuration

Railway will automatically:
1. Detect Node.js project
2. Run `npm install`
3. Use `npm start` command
4. Expose on PORT environment variable

## Files for Deployment

The backend includes:
- `Procfile` - Tells Railway the start command
- `nixpacks.toml` - Build configuration
- `package.json` - With engines field for Node version

## Troubleshooting

### ⚠️ If Railway runs the frontend instead of backend:
**Symptom:** Logs show `astro dev` or `hilfsmittel-berater-blog` 
**Solution:** 
1. Go to Railway Dashboard → Settings → General
2. Set **Root Directory** to `backend`
3. Save and redeploy

### Other issues:
1. Check Railway logs for specific errors
2. Ensure all required environment variables are set
3. Verify Node.js version is >=18.0.0
4. Confirm `backend` is set as root directory
5. Check that PORT env variable is NOT manually set (Railway auto-sets this)
