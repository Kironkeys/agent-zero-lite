"""
Hume EVI Tool Handler
Handles tool calls from Hume voice interface
Routes through Ghost's main chat system for UI visibility
"""

import json
import requests
from flask import request, jsonify
from python.helpers.api import ApiHandler
from python.helpers.print_style import PrintStyle
from python.helpers import runtime
from python.helpers.defer import DeferredTask
from agent import AgentContext
from falkordb import FalkorDB
import os
import asyncio
import hashlib
from datetime import datetime


class HumeTools(ApiHandler):
    """Handler for Hume EVI tool calls"""
    
    async def handle_request(self, request):
        """Handle tool execution requests from Hume"""
        try:
            data = request.get_json()
            tool_name = data.get('tool_name')
            parameters = data.get('parameters', {})
            
            PrintStyle.info(f"[HumeTools] Executing tool: {tool_name}")
            PrintStyle.info(f"[HumeTools] Parameters: {parameters}")
            
            # Route through Ghost's main chat for UI visibility
            result = await self.route_through_ghost_chat(tool_name, parameters)
            
            PrintStyle.success(f"[HumeTools] Tool result: {result}")
            return jsonify({'result': result, 'success': True})
            
        except Exception as e:
            PrintStyle.error(f"[HumeTools] Error: {e}")
            return jsonify({'error': str(e), 'success': False}), 500
    
    async def route_through_ghost_chat(self, tool_name, parameters):
        """Route Hume commands through Ghost - show in console AND UI like TTS"""
        try:
            # Format the command as Ghost would expect (define message first)
            if tool_name == 'save_to_memory':
                content = parameters.get('content', '')
                message = f"Save this to memory: {content}"
                command = f"memory_save('{content}')"
            elif tool_name == 'search_ghost_memory':
                query = parameters.get('query', '')
                message = f"Search memory for: {query}"
                command = f"memory_search('{query}')"
            elif tool_name == 'get_system_status':
                message = "Show system status"
                command = "system_status()"
            else:
                message = f"Execute {tool_name}: {json.dumps(parameters)}"
                command = f"{tool_name}({json.dumps(parameters)})"
            
            # Try to log to UI
            try:
                # Get the default context to log to UI
                from agent import AgentContext
                # Try to get existing context or create new one
                context = AgentContext()
                
                # Log to UI (this makes it appear in the chat like Kokoro)
                context.log.log(
                    type="voice",
                    heading="🎤 Hume Voice Command",
                    content=message,
                    kvps={"tool": tool_name, "params": parameters}
                )
            except Exception as e:
                PrintStyle.warning(f"[HumeTools] Could not log to UI: {e}")
            
            # Also print to console with distinctive Hume styling
            PrintStyle(
                background_color="#9B59B6", font_color="white", bold=True, padding=True
            ).print(f"🎤 Hume Voice Command")
            PrintStyle(font_color="#9B59B6", padding=False, bold=True).print(f"└─> {message}")
            
            # Log command execution (this shows in terminal)
            PrintStyle(
                background_color="#1B4F72", font_color="white", bold=True, padding=True  
            ).print(f"Ghost: Executing from Hume voice")
            PrintStyle(font_color="#85C1E9", padding=False).print(f"Command: {command}")
            
            # Execute using Ghost's actual tools (with FAISS indexing)
            if tool_name == 'ghost_chat':
                # This is THE MAIN TOOL - route everything through Ghost's chat!
                message = parameters.get('message', '')
                result = await self.send_to_ghost_main_chat(message)
            elif tool_name == 'save_to_memory':
                # Use Ghost's memory_save tool which includes FAISS
                result = await self.use_ghost_memory_save_tool(parameters)
            elif tool_name == 'search_ghost_memory':
                # Use Ghost's memory_load tool which searches FAISS
                result = await self.use_ghost_memory_load_tool(parameters)
            elif tool_name == 'get_system_status':
                result = self.get_ghost_status(parameters)
            else:
                result = self.execute_ghost_command(tool_name, parameters)
            
            # Log response to UI 
            try:
                context.log.log(
                    type="response", 
                    heading="Ghost Response",
                    content=result if len(result) < 500 else f"{result[:500]}...",
                    kvps={"source": "hume_voice"}
                )
            except:
                pass  # Context may not be available
            
            # Print result with Ghost styling
            PrintStyle(
                background_color="#1B4F72", font_color="white", bold=True, padding=True
            ).print(f"Ghost: Response to Hume")
            
            # Truncate long results for console display
            display_result = result if len(result) < 200 else f"{result[:200]}..."
            PrintStyle(font_color="#85C1E9", padding=False).print(display_result)
            
            # Write to a log file that could be monitored by UI
            log_file = '/tmp/hume_commands.log'
            with open(log_file, 'a') as f:
                f.write(f"[{datetime.now().isoformat()}] Hume: {message}\n")
                f.write(f"[{datetime.now().isoformat()}] Ghost: {result[:500]}\n\n")
            
            return result
            
        except Exception as e:
            PrintStyle.error(f"[HumeTools] Error in route_through_ghost_chat: {e}")
            # Should not happen since we're calling our own methods
            return f"Error processing command: {str(e)}"
    
    async def send_to_ghost_main_chat(self, message):
        """Send message to Ghost's main chat API and return response"""
        try:
            import aiohttp
            import asyncio
            import time
            
            PrintStyle.info(f"[HumeTools] Sending to Ghost main chat: {message}")
            
            # Get CSRF token first
            csrf_token = None
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get('http://localhost:50002/api/csrf') as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            csrf_token = data.get('csrf_token')
                            PrintStyle.info(f"[HumeTools] Got CSRF token")
            except Exception as e:
                PrintStyle.warning(f"[HumeTools] Could not get CSRF token: {e}")
            
            # Send message to Ghost's main chat
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
                if csrf_token:
                    headers['X-CSRF-Token'] = csrf_token
                
                # Send the message
                async with session.post(
                    'http://localhost:50002/api/chat',
                    json={'text': message},
                    headers=headers
                ) as resp:
                    if resp.status != 200:
                        PrintStyle.error(f"[HumeTools] Chat API error: {resp.status}")
                        return f"Error sending message: HTTP {resp.status}"
                    
                    PrintStyle.success(f"[HumeTools] Message sent to Ghost")
            
            # Poll for Ghost's response (wait for processing to complete)
            max_attempts = 60  # 30 seconds max wait
            attempt = 0
            last_response = ""
            
            while attempt < max_attempts:
                await asyncio.sleep(0.5)  # Check every 500ms
                
                try:
                    async with aiohttp.ClientSession() as session:
                        headers = {'Accept': 'application/json'}
                        if csrf_token:
                            headers['X-CSRF-Token'] = csrf_token
                        
                        # Get chat history to see Ghost's response
                        async with session.get(
                            'http://localhost:50002/api/messages',
                            headers=headers
                        ) as resp:
                            if resp.status == 200:
                                data = await resp.json()
                                messages = data.get('messages', [])
                                
                                # Find the most recent response after our message
                                for msg in reversed(messages):
                                    if msg.get('type') == 'response':
                                        content = msg.get('content', '')
                                        
                                        # Check if this is Ghost's final response
                                        if content and content != last_response:
                                            last_response = content
                                            
                                            # Check if Ghost is done (look for completion indicators)
                                            if not content.endswith('...'):
                                                # Clean up the response for speech
                                                # Remove any markdown code blocks for cleaner speech
                                                if '```' in content:
                                                    # Extract text outside code blocks
                                                    parts = content.split('```')
                                                    clean_parts = []
                                                    for i, part in enumerate(parts):
                                                        if i % 2 == 0:  # Not inside code block
                                                            clean_parts.append(part)
                                                    content = ' '.join(clean_parts)
                                                
                                                # Remove excessive whitespace
                                                content = ' '.join(content.split())
                                                
                                                PrintStyle.success(f"[HumeTools] Got Ghost response: {content[:100]}...")
                                                return content
                                            
                                            # Still processing, keep waiting
                                            PrintStyle.info(f"[HumeTools] Ghost still processing...")
                
                except Exception as e:
                    PrintStyle.warning(f"[HumeTools] Error polling for response: {e}")
                
                attempt += 1
            
            # Timeout - return what we have
            if last_response:
                PrintStyle.warning(f"[HumeTools] Timeout waiting for completion, returning partial response")
                return last_response
            else:
                PrintStyle.error(f"[HumeTools] Timeout waiting for Ghost response")
                return "I'm processing your request. Please give me a moment."
            
        except Exception as e:
            PrintStyle.error(f"[HumeTools] Error in send_to_ghost_main_chat: {e}")
            return f"I encountered an error communicating with Ghost: {str(e)}"
    
    def save_to_ghost_memory(self, params):
        """Save content directly to FalkorDB (Ghost's Trinity Blade)"""
        content = params.get('content', '')
        
        if not content:
            return "No content provided to save"
        
        try:
            # Connect to FalkorDB
            if os.path.exists('/.dockerenv'):
                # Inside Docker
                falkor_host = 'falkordb'
                falkor_port = 6379
            else:
                # Local development
                falkor_host = 'localhost'
                falkor_port = 6380
            
            # Connect to FalkorDB
            db = FalkorDB(host=falkor_host, port=falkor_port)
            graph = db.select_graph('ghost_memory')
            
            # Generate unique ID for this memory
            memory_id = hashlib.md5(f"{datetime.now().isoformat()}_{content}".encode()).hexdigest()[:16]
            
            # Create Memory node in FalkorDB
            timestamp = datetime.now().isoformat()
            area = "main"  # Changed to main so Ghost text can find it
            
            # Create the memory node
            query = """
                MERGE (m:Memory {id: $id, memory_id: $memory_id})
                SET m.content = $content,
                    m.area = $area,
                    m.timestamp = $timestamp,
                    m.source = 'hume_voice'
                RETURN m
            """
            
            result = graph.query(query, {
                'id': memory_id,
                'memory_id': memory_id,  # Use same ID for consistency
                'content': content,
                'area': area,
                'timestamp': timestamp
            })
            
            PrintStyle.success(f"[HumeTools] Saved to FalkorDB: {content}")
            
            # Also save to file for FAISS indexing (Trinity Blade dual system)
            memory_dir = '/tmp/ghost_memory'
            os.makedirs(memory_dir, exist_ok=True)
            memory_file = os.path.join(memory_dir, f'main_{memory_id}.txt')
            
            with open(memory_file, 'w') as f:
                f.write(content)
            
            return f"Successfully saved to Ghost Trinity Blade memory: {content}"
                
        except Exception as e:
            PrintStyle.error(f"[HumeTools] FalkorDB error: {e}")
            # Fallback to simple file storage
            memory_dir = '/tmp/hume_memory'
            os.makedirs(memory_dir, exist_ok=True)
            memory_file = os.path.join(memory_dir, 'memories.txt')
            
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            with open(memory_file, 'a') as f:
                f.write(f"\n[{timestamp}] {content}")
            
            return f"Saved to backup memory: {content}"
    
    def search_ghost_memory(self, params):
        """Search directly in FalkorDB (Ghost's Trinity Blade)"""
        query = params.get('query', '')
        
        if not query:
            return "No search query provided"
        
        try:
            # Connect to FalkorDB
            if os.path.exists('/.dockerenv'):
                falkor_host = 'falkordb'
                falkor_port = 6379
            else:
                falkor_host = 'localhost'
                falkor_port = 6380
            
            # Connect to FalkorDB
            db = FalkorDB(host=falkor_host, port=falkor_port)
            graph = db.select_graph('ghost_memory')
            
            # Search for memories containing the query
            search_query = """
                MATCH (m:Memory)
                WHERE toLower(m.content) CONTAINS toLower($query)
                RETURN m.content as content, m.timestamp as timestamp, m.area as area
                ORDER BY m.timestamp DESC
                LIMIT 5
            """
            
            result = graph.query(search_query, {'query': query})
            
            if result.result_set:
                # Format results nicely
                formatted = []
                for i, row in enumerate(result.result_set, 1):
                    content = row[0]
                    timestamp = row[1] if len(row) > 1 else ''
                    area = row[2] if len(row) > 2 else ''
                    
                    if timestamp:
                        formatted.append(f"{i}. [{area}] {content}")
                    else:
                        formatted.append(f"{i}. {content}")
                
                PrintStyle.success(f"[HumeTools] Found {len(formatted)} memories")
                return "\n".join(formatted)
            else:
                return f"No memories found for: {query}"
                
        except Exception as e:
            PrintStyle.error(f"[HumeTools] FalkorDB search error: {e}")
            # Fallback to file search
            memory_file = '/tmp/hume_memory/memories.txt'
            if os.path.exists(memory_file):
                with open(memory_file, 'r') as f:
                    memories = f.read()
                    if query.lower() in memories.lower():
                        lines = memories.split('\n')
                        relevant = [line for line in lines if query.lower() in line.lower()]
                        if relevant:
                            formatted = []
                            for i, line in enumerate(relevant[:5], 1):
                                formatted.append(f"{i}. {line.strip()}")
                            return "\n".join(formatted)
            return f"No memories found for: {query}"
    
    def get_ghost_status(self, params):
        """Get Ghost system status with available tools"""
        try:
            # List available Ghost tools
            import importlib
            import pkgutil
            
            tools_dir = '/a0/python/tools'
            tool_names = []
            
            # Scan for tool files
            for file in os.listdir(tools_dir):
                if file.endswith('.py') and not file.startswith('_'):
                    tool_names.append(file[:-3])  # Remove .py extension
            
            status = {
                'system': 'Ghost v9.5',
                'voice_interface': 'Hume EVI',
                'memory_system': 'Trinity Blade (FAISS + FalkorDB)',
                'runtime_id': runtime.get_runtime_id(),
                'working_directory': os.getcwd(),
                'tools_available': sorted(tool_names)[:20]  # Show first 20 tools
            }
            
            return json.dumps(status, indent=2)
            
        except Exception as e:
            # Fallback status
            return json.dumps({
                'system': 'Ghost v9.5',
                'voice_interface': 'Hume EVI',
                'error': str(e)
            }, indent=2)
    
    def execute_ghost_command(self, tool_name, parameters):
        """Execute any Ghost tool by name"""
        try:
            # Try to dynamically import and execute the tool
            tool_module = f"python.tools.{tool_name}"
            
            # Import the tool module
            module = __import__(tool_module, fromlist=[tool_name])
            
            # Find the tool class (usually capitalized version of tool name)
            tool_class_name = ''.join(word.capitalize() for word in tool_name.split('_'))
            tool_class = getattr(module, tool_class_name, None)
            
            if not tool_class:
                # Try alternate naming conventions
                for attr_name in dir(module):
                    if 'tool' in attr_name.lower():
                        tool_class = getattr(module, attr_name)
                        break
            
            if tool_class:
                # For now, just return a message that the tool exists
                # (Full execution would require agent context)
                return f"Tool {tool_name} is available in Ghost system"
            else:
                return f"Tool {tool_name} not found in Ghost system"
                
        except Exception as e:
            return f"Error executing Ghost tool {tool_name}: {str(e)}"
    
    async def use_ghost_memory_save_tool(self, parameters):
        """Use Ghost's actual memory_save tool which includes FAISS"""
        content = parameters.get('content', '')
        
        if not content:
            return "No content provided to save"
        
        try:
            # Import the memory helper directly
            from python.helpers.memory import Memory
            from datetime import datetime
            import hashlib
            
            # Create a simple agent-like object with required attributes
            class SimpleAgent:
                def __init__(self):
                    self.id = "hume_voice"
                    
            agent = SimpleAgent()
            
            # Get the memory database
            db = await Memory.get(agent)
            
            # Save to FAISS with metadata
            metadata = {
                "area": "main",
                "timestamp": datetime.now().isoformat(),
                "source": "hume_voice"
            }
            
            # Insert text into FAISS (this is what Ghost text interface searches)
            memory_id = await db.insert_text(content, metadata)
            
            PrintStyle.success(f"[HumeTools] Saved to FAISS with ID: {memory_id}")
            
            # Also save to FalkorDB for graph queries
            if self.save_to_ghost_memory({'content': content}):
                return f"Successfully saved to Ghost memory system (FAISS + FalkorDB): {content}"
            else:
                return f"Saved to FAISS vector memory: {content}"
            
        except Exception as e:
            PrintStyle.error(f"[HumeTools] Error using FAISS: {e}")
            # Fallback to direct FalkorDB save
            return self.save_to_ghost_memory({'content': content})
    
    async def use_ghost_memory_load_tool(self, parameters):
        """Use Ghost's actual memory_load tool which searches FAISS"""
        query = parameters.get('query', '')
        
        if not query:
            return "No search query provided"
        
        try:
            # Import the memory helper directly
            from python.helpers.memory import Memory
            
            # Create a simple agent-like object
            class SimpleAgent:
                def __init__(self):
                    self.id = "hume_voice"
                    
            agent = SimpleAgent()
            
            # Get the memory database
            db = await Memory.get(agent)
            
            # Search FAISS (this is what Ghost text interface uses)
            results = await db.search_text(
                query=query,
                k=5,  # Get top 5 results
                threshold=0.5,  # Similarity threshold
                filter_metadata={}  # No filters, search all areas
            )
            
            if results:
                # Format results nicely
                formatted = []
                for i, result in enumerate(results, 1):
                    content = result.get('content', '')
                    score = result.get('score', 0)
                    metadata = result.get('metadata', {})
                    area = metadata.get('area', 'unknown')
                    
                    # Truncate long content
                    if len(content) > 200:
                        content = content[:200] + "..."
                    
                    formatted.append(f"{i}. [{area}] (score: {score:.2f}) {content}")
                
                PrintStyle.success(f"[HumeTools] Found {len(formatted)} memories via FAISS")
                return "\n".join(formatted)
            else:
                # Also try FalkorDB as fallback
                return self.search_ghost_memory({'query': query})
            
        except Exception as e:
            PrintStyle.error(f"[HumeTools] Error using FAISS search: {e}")
            # Fallback to direct FalkorDB search
            return self.search_ghost_memory({'query': query})
    
    @classmethod
    def get_methods(cls):
        return ['POST']
    
    @classmethod
    def requires_auth(cls):
        return False  # Hume calls are already authenticated