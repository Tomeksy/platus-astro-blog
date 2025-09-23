# Railway Deployment Guide

## Two Ways to Deploy

### Option 1: Via Railway Dashboard (Recommended)
1. Connect your GitHub repository to Railway
2. In Railway settings, set **Root Directory** to: `backend`
3. Railway will auto-detect the start command from package.json
4. Add environment variables from `.env.example`

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

If deployment fails:
1. Check Railway logs for specific errors
2. Ensure all required environment variables are set
3. Verify Node.js version is >=18.0.0
4. Check that `backend` is set as root directory
