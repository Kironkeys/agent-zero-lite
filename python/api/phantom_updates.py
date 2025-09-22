"""
CLEAN SSE IMPLEMENTATION FOR PHANTOM CONSOLE
Simple, working real-time updates without CPU overload
"""

import json
import time
import os
from queue import Queue, Empty
from python.helpers.api import ApiHandler
from flask import Response

class PhantomUpdates(ApiHandler):
    """Working SSE endpoint for phantom console updates"""
    
    # Thread-safe event queue
    _event_queue = Queue(maxsize=100)
    
    @classmethod
    def requires_auth(cls) -> bool:
        return False

    @classmethod  
    def requires_csrf(cls) -> bool:
        return False

    @classmethod
    def get_methods(cls):
        return ["GET"]

    @classmethod
    def send_update(cls, update_type, data):
        """Send update to all connected clients"""
        try:
            event = {
                "type": update_type,
                "data": data,
                "timestamp": time.time()
            }
            # Non-blocking put with timeout
            cls._event_queue.put(event, block=False)
            print(f"[PhantomUpdates] Queued {update_type} event")
            
            # Also write to trigger file for fallback polling
            trigger_file = "/tmp/phantom_refresh_trigger.json"
            with open(trigger_file, 'w') as f:
                json.dump(event, f)
                
        except Exception as e:
            print(f"[PhantomUpdates] Error queuing event: {e}")

    async def process(self, input, request):
        """SSE stream endpoint with proper cleanup"""
        
        def event_generator():
            """Generate SSE events with timeout protection"""
            print("[PhantomUpdates] Client connected")
            
            # Send initial connection event
            yield f"data: {json.dumps({'type': 'connected', 'timestamp': time.time()})}\n\n"
            
            last_heartbeat = time.time()
            
            try:
                while True:
                    try:
                        # Try to get event with short timeout
                        event = self._event_queue.get(timeout=5)
                        yield f"data: {json.dumps(event)}\n\n"
                        last_heartbeat = time.time()
                        
                    except Empty:
                        # Send heartbeat every 30 seconds
                        if time.time() - last_heartbeat > 30:
                            yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
                            last_heartbeat = time.time()
                        
            except GeneratorExit:
                print("[PhantomUpdates] Client disconnected")
            except Exception as e:
                print(f"[PhantomUpdates] Stream error: {e}")
        
        return Response(
            event_generator(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'  # Disable nginx buffering
            }
        )