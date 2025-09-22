# Atomic save helper to prevent corruption on crashes
import os
import tempfile
import shutil
from pathlib import Path

def atomic_write(filepath, content, mode='w'):
    """
    Write file atomically to prevent corruption on crash.
    First writes to temp file, then atomic rename.
    """
    filepath = Path(filepath)
    
    # Create temp file in same directory (for atomic rename)
    temp_fd, temp_path = tempfile.mkstemp(
        dir=filepath.parent,
        prefix=f".{filepath.name}.",
        suffix=".tmp"
    )
    
    try:
        # Write to temp file
        with os.fdopen(temp_fd, mode) as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())  # Force write to disk
        
        # Atomic rename (replace existing)
        shutil.move(temp_path, filepath)
        return True
        
    except Exception as e:
        # Clean up temp file on error
        try:
            os.unlink(temp_path)
        except:
            pass
        raise e

def validate_behaviour_md(content):
    """
    Validate behaviour.md format before saving.
    """
    if not content:
        return False
    
    # Check for required structure
    if not content.strip().startswith('##'):
        return False
    
    # Check for corruption patterns
    corruption_signs = [
        'undefined',
        'null',
        '{{',  # Unprocessed template
        'NaN',
        '<corrupted>'
    ]
    
    for sign in corruption_signs:
        if sign in content:
            return False
    
    return True