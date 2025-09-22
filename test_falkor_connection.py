#!/usr/bin/env python3
"""
Test FalkorDB connection on Railway
"""
import os
from falkordb import FalkorDB

print("=== FalkorDB Connection Test ===")
print(f"FALKORDB_HOST: {os.getenv('FALKORDB_HOST', 'NOT SET')}")
print(f"FALKORDB_PORT: {os.getenv('FALKORDB_PORT', 'NOT SET')}")
print(f"FALKORDB_PASSWORD: {'SET' if os.getenv('FALKORDB_PASSWORD') else 'NOT SET'}")
print(f"USE_FALKORDB: {os.getenv('USE_FALKORDB', 'NOT SET')}")

host = os.getenv('FALKORDB_HOST', 'localhost')
port = int(os.getenv('FALKORDB_PORT', 6379))
password = os.getenv('FALKORDB_PASSWORD')

print(f"\nTrying to connect to {host}:{port}...")

try:
    if password:
        db = FalkorDB(host=host, port=port, password=password)
    else:
        db = FalkorDB(host=host, port=port)
    
    # Try to select a graph
    graph = db.select_graph('test_connection')
    
    # Try a simple query
    result = graph.query("RETURN 1").result_set
    
    print("✅ FalkorDB connection SUCCESSFUL!")
    print(f"Test query returned: {result}")
    
except Exception as e:
    print(f"❌ FalkorDB connection FAILED!")
    print(f"Error: {e}")
    print("\nPossible issues:")
    print("1. FalkorDB service not running")
    print("2. Environment variables not set correctly")
    print("3. Network connectivity between services")
    print("4. Wrong password or authentication failure")