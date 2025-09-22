"""
Enhanced A2A Manager for Agent Zero
Implements PR #625 improvements for multi-agent collaboration
"""

import asyncio
import json
import uuid
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import psutil
import socket
from python.helpers.print_style import PrintStyle

@dataclass
class SubordinateAgent:
    """Represents a subordinate agent instance"""
    agent_id: str
    port: int
    process_id: Optional[int] = None
    memory_limit: int = 512  # MB
    status: str = "initializing"
    context_id: str = ""
    created_at: float = 0
    parent_id: str = ""
    
class A2AManager:
    """
    Manages Agent-to-Agent protocol with enhanced features:
    - Automatic port allocation
    - Memory management
    - Peer discovery
    - Parallel agent execution
    """
    
    def __init__(self, base_port: int = 8100, max_agents: int = 10):
        self.base_port = base_port
        self.max_agents = max_agents
        self.subordinates: Dict[str, SubordinateAgent] = {}
        self.peers: Dict[str, Dict[str, Any]] = {}
        self.port_pool = list(range(base_port, base_port + max_agents))
        self.used_ports = set()
        
    def allocate_port(self) -> Optional[int]:
        """Allocate an available port for a new agent"""
        for port in self.port_pool:
            if port not in self.used_ports and self._is_port_available(port):
                self.used_ports.add(port)
                return port
        return None
    
    def _is_port_available(self, port: int) -> bool:
        """Check if a port is available for use"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return True
        except:
            return False
    
    async def spawn_subordinate(
        self,
        parent_id: str,
        task: str,
        profile: Optional[str] = None,
        memory_limit: int = 512
    ) -> Optional[SubordinateAgent]:
        """
        Spawn a new subordinate agent with automatic port allocation
        """
        # Check if we've reached max agents
        if len(self.subordinates) >= self.max_agents:
            PrintStyle.warning(f"Maximum number of agents ({self.max_agents}) reached")
            return None
        
        # Allow parallel spawning - each spawn creates a new agent
        # (PR #625 fix - removed deduplication logic that prevented parallel execution)
        
        # Allocate port
        port = self.allocate_port()
        if not port:
            PrintStyle.error("No available ports for new agent")
            return None
        
        # Create subordinate record
        agent_id = str(uuid.uuid4())[:8]
        subordinate = SubordinateAgent(
            agent_id=agent_id,
            port=port,
            memory_limit=memory_limit,
            status="initializing",
            context_id=str(uuid.uuid4()),
            created_at=asyncio.get_event_loop().time(),
            parent_id=parent_id
        )
        
        self.subordinates[agent_id] = subordinate
        
        PrintStyle.info(f"Spawned subordinate {agent_id} on port {port} for task: {task[:50]}...")
        
        # In a real implementation, this would start the actual agent process
        # For now, we simulate it
        subordinate.status = "running"
        
        return subordinate
    
    async def route_message(
        self,
        from_agent: str,
        to_agent: str,
        message: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Route messages between agents
        """
        if to_agent not in self.subordinates:
            PrintStyle.error(f"Target agent {to_agent} not found")
            return None
        
        target = self.subordinates[to_agent]
        
        if target.status != "running":
            PrintStyle.warning(f"Target agent {to_agent} is {target.status}")
            return None
        
        # In real implementation, this would use actual IPC/network communication
        # For now, we simulate the response
        response = {
            "from": to_agent,
            "to": from_agent,
            "message": f"Acknowledged: {message.get('content', '')}",
            "timestamp": asyncio.get_event_loop().time()
        }
        
        PrintStyle.info(f"Routed message from {from_agent} to {to_agent}")
        return response
    
    async def discover_peers(self, port_range: tuple = (8000, 8200)) -> List[Dict[str, Any]]:
        """
        Discover other A2A-compatible agents on the network
        """
        discovered = []
        
        for port in range(port_range[0], port_range[1]):
            if port in self.used_ports:
                continue
                
            if self._is_port_listening(port):
                peer_info = {
                    "port": port,
                    "discovered_at": asyncio.get_event_loop().time(),
                    "status": "available"
                }
                discovered.append(peer_info)
                self.peers[f"peer_{port}"] = peer_info
        
        PrintStyle.info(f"Discovered {len(discovered)} peer agents")
        return discovered
    
    def _is_port_listening(self, port: int) -> bool:
        """Check if a port has a service listening"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.1)
                result = s.connect_ex(('localhost', port))
                return result == 0
        except:
            return False
    
    async def cleanup_subordinate(self, agent_id: str) -> bool:
        """
        Clean up a subordinate agent and free resources
        """
        if agent_id not in self.subordinates:
            return False
        
        subordinate = self.subordinates[agent_id]
        
        # Free the port
        if subordinate.port in self.used_ports:
            self.used_ports.remove(subordinate.port)
        
        # Remove from tracking
        del self.subordinates[agent_id]
        
        PrintStyle.info(f"Cleaned up subordinate {agent_id} on port {subordinate.port}")
        return True
    
    async def cleanup_all(self):
        """Clean up all subordinate agents"""
        agent_ids = list(self.subordinates.keys())
        for agent_id in agent_ids:
            await self.cleanup_subordinate(agent_id)
    
    def get_agent_hierarchy(self) -> Dict[str, Any]:
        """
        Get the current agent hierarchy
        """
        hierarchy = {
            "main": {
                "port": self.base_port - 100,  # Assuming main is on base_port - 100
                "subordinates": []
            }
        }
        
        for agent_id, sub in self.subordinates.items():
            hierarchy["main"]["subordinates"].append({
                "id": agent_id,
                "port": sub.port,
                "status": sub.status,
                "memory_limit": sub.memory_limit,
                "parent": sub.parent_id
            })
        
        return hierarchy
    
    def get_memory_usage(self) -> Dict[str, int]:
        """
        Get memory usage for all agents
        """
        memory_info = {}
        
        try:
            # Get current process memory
            current_process = psutil.Process()
            memory_info["main"] = current_process.memory_info().rss // (1024 * 1024)  # MB
            
            # In real implementation, would get memory for subordinate processes
            for agent_id, sub in self.subordinates.items():
                # Simulated memory usage
                memory_info[agent_id] = min(sub.memory_limit, 256)  # Simulated
                
        except Exception as e:
            PrintStyle.error(f"Error getting memory usage: {e}")
        
        return memory_info
    
    async def handle_oom(self, agent_id: str):
        """
        Handle out-of-memory situation for an agent
        """
        if agent_id not in self.subordinates:
            return
        
        subordinate = self.subordinates[agent_id]
        subordinate.status = "oom_error"
        
        PrintStyle.warning(f"Agent {agent_id} encountered OOM, cleaning up...")
        
        # Graceful cleanup
        await self.cleanup_subordinate(agent_id)
        
        # Could implement restart logic here if needed