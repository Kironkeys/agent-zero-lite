#!/bin/bash
# Quick fix for FalkorDB connection on Railway

echo "Fixing FalkorDB connection..."

# Check current env vars
echo "Current environment variables:"
env | grep FALKOR

# Test connection
python3 << 'EOF'
import os
from falkordb import FalkorDB

host = os.getenv('FALKORDB_HOST', 'falkordb')
port = 6379
password = os.getenv('FALKORDB_PASSWORD', '')

print(f"Trying to connect to {host}:{port}")

try:
    # Try different connection methods
    for h in [host, 'falkordb', 'localhost', '127.0.0.1']:
        try:
            print(f"Attempting {h}...")
            if password:
                db = FalkorDB(host=h, port=port, password=password)
            else:
                db = FalkorDB(host=h, port=port)
            graph = db.select_graph('test')
            print(f"✅ SUCCESS with host: {h}")
            break
        except:
            print(f"❌ Failed with {h}")
            continue
except Exception as e:
    print(f"All connection attempts failed: {e}")
EOF