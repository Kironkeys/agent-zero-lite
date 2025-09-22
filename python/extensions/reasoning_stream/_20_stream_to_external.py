import asyncio
import json
import queue
import threading
from python.helpers.extension import Extension
from python.helpers.print_style import PrintStyle
from agent import LoopData

class StreamToExternal(Extension):
    """
    Extension that captures reasoning stream and makes it available to external systems.
    This allows external platforms to show real-time Agent Zero thinking.
    """
    
    # Shared queue for streaming reasoning to external consumers
    _reasoning_queues = {}
    _queue_lock = threading.Lock()
    
    @classmethod
    def register_queue(cls, context_id: str, reasoning_queue: queue.Queue):
        """Register a queue to receive reasoning updates for a specific context"""
        with cls._queue_lock:
            if context_id not in cls._reasoning_queues:
                cls._reasoning_queues[context_id] = []
            cls._reasoning_queues[context_id].append(reasoning_queue)
            PrintStyle().print(f"Registered reasoning queue for context {context_id}")
    
    @classmethod
    def unregister_queue(cls, context_id: str, reasoning_queue: queue.Queue):
        """Unregister a queue from receiving reasoning updates"""
        with cls._queue_lock:
            if context_id in cls._reasoning_queues:
                if reasoning_queue in cls._reasoning_queues[context_id]:
                    cls._reasoning_queues[context_id].remove(reasoning_queue)
                    PrintStyle().print(f"Unregistered reasoning queue for context {context_id}")
                if not cls._reasoning_queues[context_id]:
                    del cls._reasoning_queues[context_id]
    
    @classmethod
    def cleanup_context(cls, context_id: str):
        """Clean up all queues for a context"""
        with cls._queue_lock:
            if context_id in cls._reasoning_queues:
                del cls._reasoning_queues[context_id]
                PrintStyle().print(f"Cleaned up all reasoning queues for context {context_id}")
    
    async def execute(self, loop_data: LoopData = LoopData(), text: str = "", **kwargs):
        """
        This gets called whenever there's reasoning stream data.
        We capture it and send it to any registered external consumers.
        """
        
        if not text:
            return
        
        # Get context ID from agent context
        context_id = self.agent.context.id if self.agent and self.agent.context else None
        
        if not context_id:
            return
        
        # Parse the reasoning text to extract meaningful thoughts
        thoughts = []
        
        # Split by common reasoning patterns
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if line and len(line) > 10:  # Skip very short fragments
                # Clean up common prefixes
                if line.startswith('- '):
                    line = line[2:]
                elif line.startswith('* '):
                    line = line[2:]
                elif line.startswith('> '):
                    line = line[2:]
                
                # Skip purely technical lines
                if not any(skip in line.lower() for skip in ['```', '{{', '}}', '__', '==', '##']):
                    thoughts.append(line)
        
        # Send to registered queues
        with self._queue_lock:
            if context_id in self._reasoning_queues:
                for reasoning_queue in self._reasoning_queues[context_id]:
                    try:
                        # Send each thought as a separate item
                        for thought in thoughts:
                            reasoning_queue.put({
                                'type': 'thought',
                                'content': thought,
                                'context_id': context_id
                            })
                    except Exception as e:
                        PrintStyle.error(f"Failed to queue reasoning: {e}")
        
        # Also log for debugging
        if thoughts:
            PrintStyle(font_color="cyan", padding=False).print(f"[Reasoning Stream] {len(thoughts)} thoughts captured for context {context_id}")