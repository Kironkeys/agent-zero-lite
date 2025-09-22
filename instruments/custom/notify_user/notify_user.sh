#!/bin/bash
# Instrument wrapper for notify_user

PYTHON_TOOL="/a0/python/tools/notify_user.py"

# Pass all arguments to the Python tool
python3 "$PYTHON_TOOL" "$@"
