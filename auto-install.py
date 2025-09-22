#!/usr/bin/env python3
"""
Auto-install script that runs on Ghost AI startup to ensure packages are installed
"""

import subprocess
import sys
import os

def install_requirements():
    """Install packages from requirements-custom.txt"""
    requirements_file = "/a0/requirements-custom.txt"
    
    if os.path.exists(requirements_file):
        print("🔧 Installing Legacy Compass integration packages...")
        try:
            subprocess.run([
                "/opt/venv/bin/pip", "install", "--no-cache-dir", "-r", requirements_file
            ], check=True)
            print("✅ Packages installed successfully!")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install packages: {e}")
    else:
        print("⚠️ requirements-custom.txt not found")

if __name__ == "__main__":
    install_requirements()