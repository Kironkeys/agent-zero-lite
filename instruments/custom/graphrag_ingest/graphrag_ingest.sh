#!/bin/bash
# Instrument wrapper for graphrag_ingest

PYTHON_TOOL="/a0/python/tools/graphrag_ingest.py"

# Pass all arguments to the Python tool
python3 "$PYTHON_TOOL" "$@"
