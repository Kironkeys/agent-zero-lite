from python.helpers.api import ApiHandler, Request, Response
import json
import time
import queue
import threading
from python.helpers.print_style import PrintStyle

# Global queue for Chrome browser frames/events
chrome_events = queue.Queue(maxsize=100)
chrome_clients = []
chrome_lock = threading.Lock()


class ChromeBrowser(ApiHandler):
    """Chrome Browser API handler for streaming and control"""
    
    @classmethod
    def requires_auth(cls) -> bool:
        return False  # No web auth required for streaming
    
    @classmethod
    def requires_csrf(cls) -> bool:
        return False  # No CSRF for API endpoints
    
    @classmethod
    def requires_api_key(cls) -> bool:
        return False  # No API key needed for internal streaming
    
    async def process(self, input: dict, request: Request) -> dict | Response:
        """Process Chrome browser API requests"""
        
        action = input.get('action', 'stream')
        
        if action == 'stream':
            # Receive Chrome browser frames and events
            try:
                event = {
                    'type': input.get('type', 'browser_frame'),
                    'data': input,
                    'timestamp': time.time()
                }
                
                # Try to add to queue, drop oldest if full
                try:
                    chrome_events.put_nowait(event)
                except queue.Full:
                    chrome_events.get()  # Remove oldest
                    chrome_events.put_nowait(event)
                
                PrintStyle.info(f"[Chrome] Received {event['type']} event")
                
                return {'status': 'success'}
                
            except Exception as e:
                PrintStyle.error(f"Chrome stream error: {e}")
                return {'error': str(e)}
        
        elif action == 'events':
            # SSE endpoint for Chrome browser events
            def generate():
                # Send initial connection
                yield f"data: {json.dumps({'event': 'connected', 'data': {'message': 'Chrome browser stream connected'}})}\n\n"
                
                # Stream events
                while True:
                    try:
                        # Get event with timeout
                        event = chrome_events.get(timeout=30)
                        yield f"data: {json.dumps(event)}\n\n"
                    except queue.Empty:
                        # Send heartbeat
                        yield f"data: {json.dumps({'event': 'heartbeat', 'timestamp': time.time()})}\n\n"
                    except Exception as e:
                        PrintStyle.error(f"Chrome SSE error: {e}")
                        break
            
            return Response(
                generate(),
                mimetype='text/event-stream',
                headers={
                    'Cache-Control': 'no-cache',
                    'X-Accel-Buffering': 'no',
                    'Connection': 'keep-alive'
                }
            )
        
        elif action == 'launch':
            # Launch Chrome browser (called from UI)
            try:
                url = input.get('url', 'https://google.com')
                
                # Signal to Ghost to start Chrome browser
                # This would trigger Ghost to use the chrome_browser tool
                return {
                    'success': True,
                    'message': 'Chrome browser launch requested',
                    'url': url
                }
                
            except Exception as e:
                return {
                    'success': False,
                    'error': str(e)
                }
        
        else:
            return {'error': f'Unknown action: {action}'}