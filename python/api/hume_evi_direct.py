"""
Hume EVI Direct Connection Handler for Ghost v9.3
Provides direct WebSocket token and configuration for speech-to-speech
"""

import os
import json
import base64
import requests
from python.helpers.api import ApiHandler, Request, Response
from python.helpers.print_style import PrintStyle


class HumeEviDirect(ApiHandler):
    @classmethod
    def requires_auth(cls) -> bool:
        return False  # Allow from browser

    @classmethod
    def requires_csrf(cls) -> bool:
        return False  # Allow cross-origin for WebSocket

    @classmethod
    def requires_api_key(cls) -> bool:
        return False  # Browser access without API key

    @classmethod
    def get_methods(cls) -> list[str]:
        return ["POST", "GET", "OPTIONS"]

    async def process(self, input: dict, request: Request) -> dict | Response:
        """
        Handle Hume EVI direct connection requests
        Returns WebSocket access token and configuration
        """
        try:
            # Handle OPTIONS for CORS
            if request.method == "OPTIONS":
                return Response(
                    "",
                    status=200,
                    headers={
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type"
                    }
                )
            
            action = input.get("action", "connect")
            
            if action == "connect":
                # Get access token and config for WebSocket connection
                return await self.get_connection_info()
            
            elif action == "status":
                # Check connection status
                return {"connected": True, "service": "Hume EVI"}
            
            elif action == "disconnect":
                # Clean up connection
                return {"success": True, "message": "Disconnected from Hume EVI"}
            
            elif action == "get_audio":
                # Placeholder for audio retrieval
                return {"audio": None, "message": "Audio handled via WebSocket"}
            
            else:
                return {"error": f"Unknown action: {action}"}
                
        except Exception as e:
            PrintStyle.error(f"Hume EVI Direct error: {str(e)}")
            return {"error": str(e), "success": False}

    async def get_connection_info(self) -> dict:
        """
        Get WebSocket access token and configuration from Hume API
        """
        api_key = os.getenv("HUME_API_KEY")
        client_secret = os.getenv("HUME_CLIENT_SECRET")
        config_id = os.getenv("HUME_CONFIG_ID", "37e6eaa3-bfa7-42fa-b591-8978e957b8f6")
        
        if not api_key:
            PrintStyle.warning("HUME_API_KEY not found in environment")
            return {"error": "HUME_API_KEY not configured", "success": False}
        
        if not client_secret:
            PrintStyle.warning("HUME_CLIENT_SECRET not found in environment")
            return {"error": "HUME_CLIENT_SECRET not configured", "success": False}
        
        try:
            # Step 1: Get access token using client credentials
            PrintStyle.info("Getting Hume EVI access token...")
            
            auth_url = "https://api.hume.ai/oauth2-cc/token"
            auth_headers = {
                "Content-Type": "application/x-www-form-urlencoded"
            }
            
            # Create base64 encoded credentials
            credentials = f"{api_key}:{client_secret}"
            encoded_credentials = base64.b64encode(credentials.encode()).decode()
            
            auth_data = {
                "grant_type": "client_credentials"
            }
            
            # Make request with basic auth
            auth_response = requests.post(
                auth_url,
                headers={
                    "Authorization": f"Basic {encoded_credentials}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data=auth_data,
                timeout=10
            )
            
            if auth_response.status_code != 200:
                error_msg = f"Auth failed: {auth_response.status_code} - {auth_response.text}"
                PrintStyle.error(error_msg)
                return {"error": error_msg, "success": False}
            
            auth_result = auth_response.json()
            access_token = auth_result.get("access_token")
            
            if not access_token:
                return {"error": "No access token received", "success": False}
            
            PrintStyle.success(f"Got access token: {access_token[:20]}...")
            
            # Step 2: Return connection info for browser
            connection_info = {
                "success": True,
                "access_token": access_token,
                "config_id": config_id,
                "websocket_url": "wss://api.hume.ai/v0/evi/chat",
                "chat_id": None,  # Will be set by WebSocket connection
                "api_key": api_key,  # For fallback if needed
                "config": {
                    "configId": config_id,
                    "configVersion": None,  # Use latest from your custom config
                    # Your custom config already has the voice settings
                    # No need to override them here
                    "emotionDetection": True,
                    "audioEncoding": "pcm_s16le",
                    "sampleRate": 16000,
                    "channels": 1
                },
                "message": "Ready to connect to Hume EVI"
            }
            
            PrintStyle.success("Hume EVI connection info prepared")
            return connection_info
            
        except requests.exceptions.Timeout:
            error_msg = "Hume API request timed out"
            PrintStyle.error(error_msg)
            return {"error": error_msg, "success": False}
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Request error: {str(e)}"
            PrintStyle.error(error_msg)
            return {"error": error_msg, "success": False}
            
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            PrintStyle.error(error_msg)
            return {"error": error_msg, "success": False}