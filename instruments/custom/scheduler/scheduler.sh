#!/bin/bash

# Scheduler Instrument Implementation
# This wraps the Python scheduler tool

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PYTHON_TOOL="/a0/python/tools/scheduler.py"

# Pass all arguments to the Python tool
python3 "$PYTHON_TOOL" "$@"