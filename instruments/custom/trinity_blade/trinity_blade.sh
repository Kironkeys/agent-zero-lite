#!/bin/bash
# Instrument wrapper for trinity_blade

PYTHON_TOOL="/a0/python/tools/trinity_blade.py"

# Pass all arguments to the Python tool
python3 "$PYTHON_TOOL" "$@"
