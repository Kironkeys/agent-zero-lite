"""
E2B Session Manager API
Handles E2B desktop sessions with Browser Use SDK integration
"""

import os
import json
import time
import asyncio
from flask import Flask, request, jsonify, Response
# from flask_cors import CORS  # Commented out - not installed in container
import threading

try:
    from e2b_desktop import Sandbox
    E2B_AVAILABLE = True
except ImportError:
    E2B_AVAILABLE = False
    print("Warning: E2B Desktop SDK not available")

app = Flask(__name__)
# CORS(app)  # Commented out - not installed in container

# Global session storage
current_session = {
    "sandbox": None,
    "session_id": None,
    "desktop_url": None,
    "status": "inactive",
    "browser_use_installed": False
}

# Your E2B API key (already configured)
E2B_API_KEY = os.environ.get("E2B_API_KEY", "e2b_65ff97334c9894f51c8c7f2e3be0790d511ce349")

@app.route('/api/e2b/start', methods=['POST'])
async def start_session():
    """Start a new E2B session with Browser Use SDK"""
    global current_session
    
    if not E2B_AVAILABLE:
        return jsonify({"error": "E2B SDK not available"}), 500
    
    try:
        # Start sandbox
        print("🚀 Starting E2B sandbox...")
        sandbox = Sandbox(api_key=E2B_API_KEY)
        
        # Get desktop URL
        desktop_url = sandbox.get_desktop_url()
        
        # Install Browser Use SDK in the sandbox
        print("📦 Installing Browser Use SDK...")
        install_result = sandbox.run_code("""
pip install browser-use
cat > /tmp/browser_automation.py << 'EOF'
from browser_use import Browser
import asyncio

async def run_browser(task):
    browser = Browser()
    await browser.start()
    result = await browser.run(task)
    await browser.stop()
    return result

# Ready for commands
print("Browser Use SDK ready!")
EOF
        """)
        
        # Store session info
        current_session = {
            "sandbox": sandbox,
            "session_id": sandbox.id,
            "desktop_url": desktop_url,
            "status": "active",
            "browser_use_installed": True
        }
        
        # Save state for other processes
        with open('/tmp/e2b_session.json', 'w') as f:
            json.dump({
                "session_id": sandbox.id,
                "desktop_url": desktop_url,
                "status": "active"
            }, f)
        
        print(f"✅ E2B session started: {sandbox.id}")
        print(f"🖥️ Desktop URL: {desktop_url}")
        
        return jsonify({
            "success": True,
            "session_id": sandbox.id,
            "desktop_url": desktop_url,
            "message": "E2B session started with Browser Use SDK"
        })
        
    except Exception as e:
        print(f"❌ Error starting E2B: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/e2b/run-browser', methods=['POST'])
async def run_browser_task():
    """Run a Browser Use task in the E2B environment"""
    global current_session
    
    if not current_session.get("sandbox"):
        return jsonify({"error": "No active E2B session"}), 400
    
    data = request.json
    task = data.get("task", "Navigate to Google and search for AI news")
    
    try:
        sandbox = current_session["sandbox"]
        
        # Run Browser Use task
        print(f"🌐 Running browser task: {task}")
        result = sandbox.run_code(f"""
import asyncio
from browser_use import Browser

async def main():
    browser = Browser()
    await browser.start()
    result = await browser.run("{task}")
    await browser.stop()
    return result

result = asyncio.run(main())
print(result)
        """)
        
        return jsonify({
            "success": True,
            "result": result.output,
            "desktop_url": current_session["desktop_url"]
        })
        
    except Exception as e:
        print(f"❌ Error running browser task: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/e2b/status', methods=['GET'])
def get_status():
    """Get current E2B session status"""
    return jsonify({
        "status": current_session["status"],
        "session_id": current_session.get("session_id"),
        "desktop_url": current_session.get("desktop_url"),
        "browser_use_ready": current_session.get("browser_use_installed", False)
    })

@app.route('/api/e2b/stop', methods=['POST'])
async def stop_session():
    """Stop the current E2B session"""
    global current_session
    
    if current_session.get("sandbox"):
        try:
            await current_session["sandbox"].close()
            current_session = {
                "sandbox": None,
                "session_id": None,
                "desktop_url": None,
                "status": "inactive",
                "browser_use_installed": False
            }
            
            # Clear state file
            if os.path.exists('/tmp/e2b_session.json'):
                os.remove('/tmp/e2b_session.json')
            
            return jsonify({"success": True, "message": "E2B session stopped"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    return jsonify({"message": "No active session to stop"})

if __name__ == '__main__':
    # Run on a different port to avoid conflicts
    app.run(host='0.0.0.0', port=5555, debug=False)