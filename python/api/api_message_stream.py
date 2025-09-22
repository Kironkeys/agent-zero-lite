import asyncio
import json
import base64
import os
from datetime import datetime, timedelta
from agent import AgentContext, UserMessage, AgentContextType
from python.helpers.api import ApiHandler, Request, Response
from python.helpers import files
from python.helpers.print_style import PrintStyle
from werkzeug.utils import secure_filename
from initialize import initialize_agent
import threading
import queue
import time
from python.extensions.reasoning_stream._20_stream_to_external import StreamToExternal


class ApiMessageStream(ApiHandler):
    """Streaming version of ApiMessage that sends reasoning in real-time via SSE"""
    
    # Track chat lifetimes for cleanup
    _chat_lifetimes = {}
    _cleanup_lock = threading.Lock()

    @classmethod
    def requires_auth(cls) -> bool:
        return False  # No web auth required

    @classmethod
    def requires_csrf(cls) -> bool:
        return False  # No CSRF required

    @classmethod
    def requires_api_key(cls) -> bool:
        return True  # Require API key

    async def process(self, input: dict, request: Request) -> dict | Response:
        # Extract parameters
        context_id = input.get("context_id", "")
        message = input.get("message", "")
        attachments = input.get("attachments", [])
        lifetime_hours = input.get("lifetime_hours", 24)  # Default 24 hours

        if not message:
            return Response('{"error": "Message is required"}', status=400, mimetype="application/json")

        # Handle attachments (base64 encoded)
        attachment_paths = []
        if attachments:
            upload_folder_int = "/a0/tmp/uploads"
            upload_folder_ext = files.get_abs_path("tmp/uploads")
            os.makedirs(upload_folder_ext, exist_ok=True)

            for attachment in attachments:
                if not isinstance(attachment, dict) or "filename" not in attachment or "base64" not in attachment:
                    continue

                try:
                    filename = secure_filename(attachment["filename"])
                    if not filename:
                        continue

                    # Decode base64 content
                    file_content = base64.b64decode(attachment["base64"])

                    # Save to temp file
                    save_path = os.path.join(upload_folder_ext, filename)
                    with open(save_path, "wb") as f:
                        f.write(file_content)

                    attachment_paths.append(os.path.join(upload_folder_int, filename))
                except Exception as e:
                    PrintStyle.error(f"Failed to process attachment {attachment.get('filename', 'unknown')}: {e}")
                    continue

        # Get or create context
        if context_id:
            context = AgentContext.get(context_id)
            if not context:
                return Response('{"error": "Context not found"}', status=404, mimetype="application/json")
        else:
            config = initialize_agent()
            context = AgentContext(config=config, type=AgentContextType.USER)
            context_id = context.id

        # Update chat lifetime
        with self._cleanup_lock:
            self._chat_lifetimes[context_id] = datetime.now() + timedelta(hours=lifetime_hours)

        # Create a queue for streaming data
        reasoning_queue = queue.Queue()
        
        # Register our queue with the extension to receive reasoning updates
        StreamToExternal.register_queue(context_id, reasoning_queue)
        
        # Create SSE response generator
        def generate():
            try:
                # Send initial context_id
                yield f"data: {json.dumps({'type': 'context', 'context_id': context_id})}\n\n"
                
                # Flag to track if we're done
                task_complete = threading.Event()
                
                # Function to process the message in background
                def process_message():
                    try:
                        # Send message to agent - this will trigger reasoning stream
                        task = context.communicate(UserMessage(message, attachment_paths))
                        result = asyncio.run_coroutine_threadsafe(task.result(), asyncio.new_event_loop()).result()
                        
                        # Once complete, send the final response
                        reasoning_queue.put({
                            'type': 'final_response',
                            'content': result
                        })
                        reasoning_queue.put({'type': 'done'})
                        task_complete.set()
                    except Exception as e:
                        PrintStyle.error(f"Process message error: {e}")
                        reasoning_queue.put({
                            'type': 'error',
                            'message': str(e)
                        })
                        task_complete.set()
                
                # Start processing in background
                process_thread = threading.Thread(target=process_message)
                process_thread.daemon = True
                process_thread.start()
                
                # Stream reasoning updates as they come in
                while not task_complete.is_set() or not reasoning_queue.empty():
                    try:
                        # Get reasoning update with timeout
                        item = reasoning_queue.get(timeout=0.5)
                        
                        # Send via SSE
                        yield f"data: {json.dumps(item)}\n\n"
                        
                        # Break if done
                        if item.get('type') == 'done' or item.get('type') == 'error':
                            break
                            
                    except queue.Empty:
                        # Send heartbeat to keep connection alive
                        yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
                    except Exception as e:
                        PrintStyle.error(f"Stream error: {e}")
                        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
                        break
                
            finally:
                # Cleanup
                StreamToExternal.unregister_queue(context_id, reasoning_queue)
                self._cleanup_expired_chats()
        
        # Return SSE response
        return Response(generate(), mimetype="text/event-stream",
                       headers={
                           "Cache-Control": "no-cache",
                           "Connection": "keep-alive",
                           "X-Accel-Buffering": "no"
                       })

    @classmethod
    def _cleanup_expired_chats(cls):
        """Clean up expired chats"""
        with cls._cleanup_lock:
            now = datetime.now()
            expired_contexts = [
                context_id for context_id, expiry in cls._chat_lifetimes.items()
                if now > expiry
            ]

            for context_id in expired_contexts:
                try:
                    context = AgentContext.get(context_id)
                    if context:
                        context.reset()
                        AgentContext.remove(context_id)
                    del cls._chat_lifetimes[context_id]
                    PrintStyle().print(f"Cleaned up expired chat: {context_id}")
                except Exception as e:
                    PrintStyle.error(f"Failed to cleanup chat {context_id}: {e}")