"""
WebSocket handler for browser VNC status
Pushes browser state changes to UI in real-time
"""
from python.helpers.api import ApiHandler, Request, Response
from python.helpers.print_style import PrintStyle
import asyncio
import json
import weakref

# Global WebSocket connections
browser_ws_clients = weakref.WeakSet()

class BrowserWebSocket(ApiHandler):
    """WebSocket handler for browser VNC status"""
    
    @classmethod
    def requires_auth(cls) -> bool:
        return False
    
    @classmethod
    def requires_csrf(cls) -> bool:
        return False
    
    @classmethod
    def requires_api_key(cls) -> bool:
        return False
    
    async def process(self, input: dict, request: Request) -> dict | Response:
        """Handle WebSocket connections for browser status"""
        
        # This would need Flask-SocketIO or similar for proper WebSocket support
        # For now, return status endpoint
        
        action = input.get('action', 'status')
        
        if action == 'status':
            # Check if browser is running
            import subprocess
            try:
                result = subprocess.run(
                    ["ps", "aux"],
                    capture_output=True,
                    text=True,
                    timeout=1
                )
                browser_running = "chrome" in result.stdout.lower() or "chromium" in result.stdout.lower()
                
                return {
                    'browser_active': browser_running,
                    'vnc_url': 'http://localhost:5800/vnc.html' if browser_running else None
                }
            except Exception as e:
                PrintStyle.error(f"Error checking browser status: {e}")
                return {'browser_active': False, 'error': str(e)}
        
        elif action == 'subscribe':
            # This would be the WebSocket subscription endpoint
            # Need Flask-SocketIO for real implementation
            return {
                'message': 'WebSocket subscription not yet implemented',
                'fallback': 'Use polling with /api/browser_websocket?action=status'
            }
        
        return {'error': 'Unknown action'}

# Helper function to broadcast browser state changes
async def broadcast_browser_state(is_active: bool):
    """Broadcast browser state to all connected WebSocket clients"""
    message = json.dumps({
        'type': 'browser_state',
        'active': is_active,
        'vnc_url': 'http://localhost:5800/vnc.html' if is_active else None
    })
    
    # In real WebSocket implementation, would send to all clients
    for client in browser_ws_clients:
        try:
            await client.send(message)
        except Exception as e:
            PrintStyle.error(f"Error broadcasting to client: {e}")