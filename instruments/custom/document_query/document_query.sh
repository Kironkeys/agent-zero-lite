#!/bin/bash

# Document Query Instrument Implementation
# This wraps the Python document query functionality

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if original document_query tool exists, use it if available
PYTHON_TOOL="/a0/python/tools/document_query.py"
if [ -f "$PYTHON_TOOL" ]; then
    # Use the original Agent Zero document query tool
    python3 "$PYTHON_TOOL" "$@"
else
    # Fall back to our custom instrument
    CUSTOM_TOOL="$SCRIPT_DIR/document_query.py" 
    python3 "$CUSTOM_TOOL" "$@"
fi