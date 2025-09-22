#!/bin/bash

# Railway persistent volume setup
if [ -d "/a0/persistent" ]; then
    echo "Setting up persistent directories..."
    
    # Create persistent directories if they don't exist
    mkdir -p /a0/persistent/memory
    mkdir -p /a0/persistent/logs
    mkdir -p /a0/persistent/outputs
    
    # Copy existing memory data if migrating
    if [ -d "/a0/memory" ] && [ ! -L "/a0/memory" ]; then
        cp -r /a0/memory/* /a0/persistent/memory/ 2>/dev/null || true
        rm -rf /a0/memory
    fi
    
    # Create symlinks
    [ ! -L "/a0/memory" ] && ln -sf /a0/persistent/memory /a0/memory
    [ ! -L "/a0/logs" ] && ln -sf /a0/persistent/logs /a0/logs
    [ ! -L "/a0/outputs" ] && ln -sf /a0/persistent/outputs /a0/outputs
    
    echo "Persistent directories configured"
fi

# Start the application
exec python run.py