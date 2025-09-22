#!/bin/bash
# Instrument wrapper for graphrag_query

PYTHON_TOOL="/a0/python/tools/graphrag_query.py"

# Pass all arguments to the Python tool
python3 "$PYTHON_TOOL" "$@"
