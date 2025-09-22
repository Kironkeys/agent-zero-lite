# 🚀 Railway Deployment Guide - Ghost Agent Zero with FalkorDB

## Step 1: Deploy FalkorDB Service

### In Railway Dashboard:
1. Click "New Service" → "Template"
2. Search for "FalkorDB" template
3. Configure with these EXACT environment variables:

```
PORT=6379
REDIS_ARGS=--requirepass ${{FALKOR_PASSWORD}}
FALKOR_HOST=${{RAILWAY_PRIVATE_DOMAIN}}
FALKOR_PORT=${{PORT}}
FALKOR_PASSWORD=${{secret(16)}}
FALKOR_USERNAME=default
FALKOR_PUBLIC_HOST=${{RAILWAY_TCP_PROXY_DOMAIN}}
FALKOR_PUBLIC_PORT=${{RAILWAY_TCP_PROXY_PORT}}
```

✅ FalkorDB will auto-generate a secure password and private networking domain.

## Step 2: Add Persistent Volume

### In your Main App Service:
1. Go to Settings → Volumes
2. Click "Mount Volume"
3. Mount path: `/a0/persistent`
4. Size: 5GB (or more for production)

## Step 3: Configure Main App Environment Variables

### Add to your Ghost Agent Zero service:

```bash
# FalkorDB Connection (reference FalkorDB service)
FALKORDB_HOST=${{FalkorDB.RAILWAY_PRIVATE_DOMAIN}}
FALKORDB_PORT=6379
FALKORDB_PASSWORD=${{FalkorDB.FALKOR_PASSWORD}}
USE_FALKORDB=true
NEO4J_DISABLED=true

# API Keys (keep your existing ones)
OPENAI_API_KEY=${{OPENAI_API_KEY}}
ANTHROPIC_API_KEY=${{ANTHROPIC_API_KEY}}
GROQ_API_KEY=${{GROQ_API_KEY}}
DEEPSEEK_API_KEY=${{DEEPSEEK_API_KEY}}
MISTRAL_API_KEY=${{MISTRAL_API_KEY}}

# Other configs
WEB_UI_PORT=80
WEB_UI_HOST=0.0.0.0
ROOT_PASSWORD=${{ROOT_PASSWORD}}
```

## Step 4: Update Dockerfile for Persistent Storage

```dockerfile
# Add to existing Dockerfile
RUN mkdir -p /a0/persistent/memory /a0/persistent/falkordb_data \
             /a0/persistent/logs /a0/persistent/outputs

# Create symlinks to persistent volume
RUN ln -sf /a0/persistent/memory /a0/memory && \
    ln -sf /a0/persistent/logs /a0/logs && \
    ln -sf /a0/persistent/outputs /a0/outputs
```

## Step 5: Deploy & Test

### Deployment Order:
1. **Deploy FalkorDB first** - Wait for "Ready to accept connections" in logs
2. **Deploy main app** with updated environment variables
3. **Test GraphRAG**: Save "John works at TechCorp" and verify entities in logs
4. **Test persistence**: Redeploy and verify data remains

## What Gets Persisted

The `/a0/persistent` volume stores:
- **`/memory`** - FAISS vector indexes and memories
- **`/falkordb_data`** - GraphRAG entity graphs  
- **`/logs`** - Application logs
- **`/outputs`** - Generated files

## Verification Checklist

✅ **FalkorDB Working:**
- Check logs for GraphRAG entity extraction
- Look for "Processing Documents" progress bars

✅ **Tools Enabled:**
- Scheduler, Notify, Document Query all active
- GraphRAG ingest/query tools functional

✅ **Persistence Working:**
- Data survives container restarts
- Memories and entities remain after redeploy

## Important Notes

- FalkorDB password auto-generates with `${{secret(16)}}`
- Use `${{FalkorDB.RAILWAY_PRIVATE_DOMAIN}}` for internal networking
- The volume mount at `/a0/persistent` ensures everything survives redeploys
- GraphRAG uses utility model when configured (cheaper entity extraction)