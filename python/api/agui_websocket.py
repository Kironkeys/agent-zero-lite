"""
WebSocket handler for AGUI interactions
Handles approval responses and consultation submissions from dynamic UI components
"""
from python.helpers.api import ApiHandler, Request, Response
import asyncio
import json
import weakref
import time

# Global WebSocket connections for AGUI
agui_ws_clients = weakref.WeakSet()

# Global approval and consultation handlers registry
approval_handlers = {}
consultation_handlers = {}

class AGUIWebSocket(ApiHandler):
    """WebSocket handler for AGUI component interactions"""
    
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
        """Handle WebSocket connections for AGUI interactions"""
        
        websocket = input.get("websocket")
        if not websocket:
            return {"error": "WebSocket connection required"}
        
        # Add client to global set
        agui_ws_clients.add(websocket)
        
        try:
            async for message in websocket:
                if message.type == "text":
                    try:
                        data = json.loads(message.data)
                        await self._handle_agui_message(websocket, data)
                    except json.JSONDecodeError:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Invalid JSON"
                        }))
                elif message.type == "close":
                    break
                    
        except Exception as e:
            print(f"AGUI WebSocket error: {e}")
        finally:
            # Client disconnected, remove from set
            agui_ws_clients.discard(websocket)
        
        return {"status": "disconnected"}
    
    async def _handle_agui_message(self, websocket, data: dict):
        """Handle incoming AGUI message"""
        message_type = data.get("type")
        message_data = data.get("data", {})
        
        try:
            if message_type == "APPROVAL_RESPONSE":
                await self._handle_approval_response(websocket, message_data)
            elif message_type == "CONSULTATION_RESPONSE":
                await self._handle_consultation_response(websocket, message_data)
            elif message_type == "APPROVAL_DETAILS":
                await self._handle_approval_details(websocket, message_data)
            elif message_type == "SYNC_REQUEST":
                await self._handle_sync_request(websocket)
            else:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                }))
                
        except Exception as e:
            print(f"Error handling AGUI message {message_type}: {e}")
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"Error processing {message_type}: {str(e)}"
            }))
    
    async def _handle_approval_response(self, websocket, data: dict):
        """Handle approval response from UI"""
        approval_id = data.get("id")
        approved = data.get("approved")
        
        if not approval_id:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "Approval ID required"
            }))
            return
        
        # Find the approval handler
        handler = approval_handlers.get(approval_id)
        if handler:
            # Notify the approval tool
            handler.handle_approval_response(approval_id, approved)
            
            # Send confirmation to UI
            await websocket.send_text(json.dumps({
                "type": "approval_confirmed",
                "id": approval_id,
                "approved": approved,
                "message": f"✅ Approval {'granted' if approved else 'denied'}"
            }))
            
            # Remove handler as it's resolved
            del approval_handlers[approval_id]
        else:
            await websocket.send_text(json.dumps({
                "type": "error", 
                "message": f"No handler found for approval {approval_id}"
            }))
    
    async def _handle_consultation_response(self, websocket, data: dict):
        """Handle consultation response from UI"""
        consultation_id = data.get("id")
        response = data.get("response", "")
        
        if not consultation_id:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "Consultation ID required"
            }))
            return
        
        # Find the consultation handler
        handler = consultation_handlers.get(consultation_id)
        if handler:
            # Notify the consultation tool
            handler.handle_consultation_response(consultation_id, response)
            
            # Send confirmation to UI
            await websocket.send_text(json.dumps({
                "type": "consultation_confirmed",
                "id": consultation_id,
                "message": "💡 Response received, thank you!"
            }))
            
            # Remove handler as it's resolved
            del consultation_handlers[consultation_id]
        else:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"No handler found for consultation {consultation_id}"
            }))
    
    async def _handle_approval_details(self, websocket, data: dict):
        """Handle request for more approval details"""
        approval_id = data.get("id")
        
        # For now, just acknowledge the request
        await websocket.send_text(json.dumps({
            "type": "details_shown",
            "id": approval_id,
            "message": "Details displayed"
        }))
    
    async def _handle_sync_request(self, websocket):
        """Handle sync request from client"""
        await websocket.send_text(json.dumps({
            "type": "sync_response",
            "timestamp": time.time(),
            "active_approvals": len(approval_handlers),
            "active_consultations": len(consultation_handlers)
        }))


def register_approval_handler(approval_id: str, handler):
    """Register an approval handler for WebSocket communication"""
    approval_handlers[approval_id] = handler


def register_consultation_handler(consultation_id: str, handler):
    """Register a consultation handler for WebSocket communication"""  
    consultation_handlers[consultation_id] = handler


async def broadcast_to_agui_clients(message: dict):
    """Broadcast message to all connected AGUI WebSocket clients"""
    if agui_ws_clients:
        message_json = json.dumps(message)
        for client in list(agui_ws_clients):
            try:
                await client.send_text(message_json)
            except Exception as e:
                print(f"Error broadcasting to AGUI client: {e}")
                agui_ws_clients.discard(client)