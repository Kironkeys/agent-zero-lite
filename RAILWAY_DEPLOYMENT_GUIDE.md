# 🚀 Railway Deployment Guide - Ghost Agent Zero v9.5

## Quick Deploy to Railway

### Step 1: Prepare Repository
```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial Ghost Agent Zero deployment"

# Push to GitHub (Railway will connect to this repo)
git remote add origin https://github.com/yourusername/agent-zero-lite.git
git push -u origin main
```

### Step 2: Deploy to Railway
1. Go to [Railway.app](https://railway.app)
2. Sign up/Login with GitHub
3. Click "Deploy from GitHub repo"
4. Select this `agent-zero-lite` repository
5. Railway will automatically detect the `Dockerfile`

### Step 3: Configure Environment Variables
In Railway dashboard → Variables tab, add these environment variables from `.env.railway`:

**Required:**
- `API_KEY_OPENROUTER=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`
- `HUME_API_KEY=qILbv6QiTfI4HKpi32tvnmfvhqkE8gimQ5pNvgV1reK22Bzt`
- `HUME_CLIENT_SECRET=pGKDiweVGSAKujjfzSlNCIMeKvVXcD60kWVOKJkEOj5jnzVq8yGsGV09K3D5v3Cr`
- `HUME_CONFIG_ID=37e6eaa3-bfa7-42fa-b591-8978e957b8f6`
- `ROOT_PASSWORD=xvOPMQyoz46wxfD3AIQFky1uf9Pp1HVO`

**Optional (add if you have them):**
- `API_KEY_ANTHROPIC=`
- `API_KEY_OPENAI=`
- `API_KEY_GROQ=`

### Step 4: Enable Public Access
1. In Railway dashboard → Settings
2. Generate Domain → Get your public URL
3. Example: `https://agent-zero-lite-production.up.railway.app`

### Step 5: Test Deployment
1. Visit your Railway URL
2. Ghost UI should load
3. Test basic functionality

## Integration with Legacy Compass

Once deployed, update Legacy Compass to use your Railway URL:
```javascript
// In Legacy Compass API route
const GHOST_URL = 'https://your-railway-url.up.railway.app'
```

## Database Persistence (Optional)

For persistent memory across restarts:
1. Add Railway Redis add-on
2. Update environment variables:
   ```
   USE_FALKORDB=true
   FALKORDB_HOST=redis.railway.internal
   FALKORDB_PORT=6379
   ```

## Troubleshooting

**Build Issues:**
- Check Railway build logs for Python package errors
- Verify all requirements in `requirements-custom.txt`

**Runtime Issues:**
- Check Railway deployment logs
- Verify environment variables are set correctly

**Connection Issues:**
- Ensure CORS is configured for Legacy Compass domain
- Check if Railway URL is publicly accessible

## Success Criteria ✅

Deployment successful when:
- [ ] Ghost UI loads on Railway public URL
- [ ] API endpoints respond (test `/api/agent-zero`)
- [ ] Legacy Compass can connect to Ghost
- [ ] Response times under 5 seconds

## Next Steps

1. **Test the deployment** - Verify Ghost loads and responds
2. **Update Legacy Compass** - Point to Railway URL
3. **Monitor performance** - Check logs and response times
4. **Add Redis persistence** - If memory needs to survive restarts