#!/bin/bash
# Instrument wrapper for graphrag_delete

PYTHON_TOOL="/a0/python/tools/graphrag_delete.py"

# Pass all arguments to the Python tool
python3 "$PYTHON_TOOL" "$@"
