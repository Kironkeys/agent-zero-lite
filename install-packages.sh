#!/bin/bash
# Auto-install required packages for Legacy Compass integration

echo "🔧 Installing Legacy Compass integration packages..."

# Install packages if not already installed
/opt/venv/bin/pip install supabase==2.18.1 falkordb==1.2.0 graphrag-sdk==0.8.0

echo "✅ Legacy Compass integration packages installed"

# Continue with normal startup
exec "$@"