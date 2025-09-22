#!/bin/bash

# Kill any local Redis/FalkorDB that might be running from base image
echo "Stopping any local Redis/FalkorDB instances..."
pkill -f redis-server || true
pkill -f falkordb || true
killall redis-server 2>/dev/null || true

# Railway persistent volume setup
if [ -d "/a0/persistent" ]; then
    echo "Setting up persistent directories..."
    
    # Create all persistent directories if they don't exist
    mkdir -p /a0/persistent/memory
    mkdir -p /a0/persistent/logs
    mkdir -p /a0/persistent/outputs
    mkdir -p /a0/persistent/knowledge
    mkdir -p /a0/persistent/instruments
    mkdir -p /a0/persistent/tmp
    
    # Copy existing data if migrating (only if not already a symlink)
    for dir in memory logs outputs knowledge instruments tmp; do
        if [ -d "/a0/$dir" ] && [ ! -L "/a0/$dir" ]; then
            echo "Migrating existing $dir data..."
            cp -r /a0/$dir/* /a0/persistent/$dir/ 2>/dev/null || true
            rm -rf /a0/$dir
        fi
    done
    
    # Create symlinks for all persistent directories
    [ ! -L "/a0/memory" ] && ln -sf /a0/persistent/memory /a0/memory
    [ ! -L "/a0/logs" ] && ln -sf /a0/persistent/logs /a0/logs
    [ ! -L "/a0/outputs" ] && ln -sf /a0/persistent/outputs /a0/outputs
    [ ! -L "/a0/knowledge" ] && ln -sf /a0/persistent/knowledge /a0/knowledge
    [ ! -L "/a0/instruments" ] && ln -sf /a0/persistent/instruments /a0/instruments
    [ ! -L "/a0/tmp" ] && ln -sf /a0/persistent/tmp /a0/tmp
    
    echo "Persistent directories configured"
fi

# Override the initialize.sh to not start local FalkorDB
export SKIP_FALKORDB=true
export NO_LOCAL_REDIS=true

# Start ONLY the web UI and API, not FalkorDB
cd /a0
/opt/venv/bin/python run.py