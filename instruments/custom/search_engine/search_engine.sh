#!/bin/bash
# Instrument wrapper for search_engine

PYTHON_TOOL="/a0/python/tools/search_engine.py"

# Pass all arguments to the Python tool
python3 "$PYTHON_TOOL" "$@"
