#!/bin/bash
# Instrument wrapper for secrets_manager

PYTHON_TOOL="/a0/python/tools/secrets_manager.py"

# Pass all arguments to the Python tool
python3 "$PYTHON_TOOL" "$@"
