import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
import uuid

# Supabase configuration
SUPABASE_URL = "https://huctdsixkznaqhitpmfp.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Y3Rkc2l4a3puYXFoaXRwbWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczOTA3MTYsImV4cCI6MjA3Mjk2NjcxNn0.i3Ex-dgBk2PDURCONf8RXOQiqO9jexZFZn1MsC7-VkE"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Y3Rkc2l4a3puYXFoaXRwbWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM5MDcxNiwiZXhwIjoyMDcyOTY2NzE2fQ.ALWKEN8rzklqaL12RMzO-PiI2pqZRiEVHKudvebqv1Y"

# Default user ID (consistent across all devices)
DEFAULT_USER_ID = "8123d05f-5af8-4e39-b2b2-677416dacf07"

class SupabaseGhostClient:
    """Supabase client for Ghost AI system to persist conversations"""
    
    def __init__(self):
        # Use service role key for full access from Python backend
        self.client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        self.user_id = DEFAULT_USER_ID
        
    def save_ghost_conversation(
        self, 
        context_id: str,
        context_name: str,
        messages: List[Dict[str, Any]],
        property_id: Optional[str] = None,
        farm_id: Optional[str] = None
    ) -> bool:
        """Save Ghost AI conversation to Supabase ghost_conversations table"""
        try:
            # Convert Agent Zero message format to Legacy Compass format
            converted_messages = self._convert_messages_format(messages)
            
            # Use context_id as property_id if not provided
            if not property_id:
                property_id = context_id
            
            # Use default farm if not provided
            if not farm_id:
                farm_id = "default-ghost-farm"
            
            # Create a meaningful label for debugging
            short_property = property_id[:8] + "..." if len(property_id) > 8 else property_id
            short_context = context_name[:20] + "..." if len(context_name) > 20 else context_name
            debug_label = f"🏷️ {short_context} | {short_property} | {len(converted_messages)} msgs"
            
            print(f"💾 GHOST SAVE: {debug_label}")
            print(f"   📍 Full Property ID: {property_id}")
            print(f"   🌾 Farm ID: {farm_id}")
            print(f"   📝 Context Name: {context_name}")
            
            conversation_data = {
                "user_id": self.user_id,
                "property_id": property_id,
                "farm_id": farm_id,
                "messages": converted_messages,
                "updated_at": datetime.now().isoformat()
            }
            
            # Check if conversation exists
            existing = self.client.table('ghost_conversations').select('id').eq(
                'user_id', self.user_id
            ).eq('property_id', property_id).eq('farm_id', farm_id).execute()
            
            if existing.data:
                # Update existing
                result = self.client.table('ghost_conversations').update({
                    "messages": converted_messages,
                    "updated_at": datetime.now().isoformat()
                }).eq('user_id', self.user_id).eq('property_id', property_id).eq('farm_id', farm_id).execute()
            else:
                # Insert new
                result = self.client.table('ghost_conversations').insert(conversation_data).execute()
            
            if result.data:
                print(f"✅ Ghost conversation saved to Supabase: {context_id}")
                return True
            else:
                print(f"❌ Failed to save Ghost conversation: {result}")
                return False
                
        except Exception as e:
            print(f"❌ Error saving Ghost conversation to Supabase: {e}")
            return False
    
    def load_ghost_conversation(
        self, 
        context_id: str,
        property_id: Optional[str] = None,
        farm_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Load Ghost AI conversation from Supabase"""
        try:
            # Use context_id as property_id if not provided
            if not property_id:
                property_id = context_id
            
            # Use default farm if not provided  
            if not farm_id:
                farm_id = "default-ghost-farm"
            
            result = self.client.table('ghost_conversations').select('messages').eq(
                'user_id', self.user_id
            ).eq('property_id', property_id).eq('farm_id', farm_id).execute()
            
            if result.data and len(result.data) > 0:
                messages = result.data[0]['messages']
                # Convert back to Agent Zero format
                converted_messages = self._convert_messages_to_agent_zero_format(messages)
                
                # Create debug label for loading
                short_property = property_id[:8] + "..." if len(property_id) > 8 else property_id
                debug_label = f"🏷️ LOADED | {short_property} | {len(messages)} msgs"
                
                print(f"📥 GHOST LOAD: {debug_label}")
                print(f"   📍 Context ID: {context_id}")
                print(f"   📍 Property ID: {property_id}")
                print(f"   🌾 Farm ID: {farm_id}")
                
                return converted_messages
            else:
                print(f"ℹ️ No existing Ghost conversation found: {context_id}")
                print(f"   📍 Property ID: {property_id}")
                print(f"   🌾 Farm ID: {farm_id}")
                return []
                
        except Exception as e:
            print(f"❌ Error loading Ghost conversation from Supabase: {e}")
            return []
    
    def clear_ghost_conversation(
        self, 
        context_id: str,
        property_id: Optional[str] = None,
        farm_id: Optional[str] = None
    ) -> bool:
        """Clear Ghost AI conversation from Supabase"""
        try:
            # Use context_id as property_id if not provided
            if not property_id:
                property_id = context_id
            
            # Use default farm if not provided
            if not farm_id:
                farm_id = "default-ghost-farm"
            
            result = self.client.table('ghost_conversations').delete().eq(
                'user_id', self.user_id
            ).eq('property_id', property_id).eq('farm_id', farm_id).execute()
            
            print(f"✅ Cleared Ghost conversation from Supabase: {context_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error clearing Ghost conversation from Supabase: {e}")
            return False
    
    def _convert_messages_format(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert Agent Zero message format to Legacy Compass format"""
        converted = []
        
        for msg in messages:
            # Agent Zero format: {"role": "user/assistant", "content": "..."}
            # Legacy Compass format: {"id": "uuid", "role": "user/assistant", "content": "...", "timestamp": "iso"}
            converted_msg = {
                "id": str(uuid.uuid4()),
                "role": msg.get("role", "user"),
                "content": msg.get("content", ""),
                "timestamp": datetime.now().isoformat()
            }
            converted.append(converted_msg)
        
        return converted
    
    def _convert_messages_to_agent_zero_format(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert Legacy Compass message format back to Agent Zero format"""
        converted = []
        
        for msg in messages:
            # Legacy Compass format: {"id": "uuid", "role": "user/assistant", "content": "...", "timestamp": "iso"}
            # Agent Zero format: {"role": "user/assistant", "content": "..."}
            converted_msg = {
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            }
            converted.append(converted_msg)
        
        return converted

# Global instance
supabase_ghost = SupabaseGhostClient()