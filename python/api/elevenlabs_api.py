"""
ElevenLabs API endpoint for Ghost integration
"""

import os
from flask import jsonify

def register_elevenlabs_routes(app):
    """Register ElevenLabs API routes with Flask app"""
    
    @app.route('/api/elevenlabs/credentials', methods=['GET'])
    def get_elevenlabs_credentials():
        """Get ElevenLabs API credentials from environment"""
        try:
            api_key = os.getenv('ELEVENLABS_API_KEY', '')
            voice_id = os.getenv('ELEVENLABS_VOICE_ID', '71rg5fZp3CKz6u0BoSGV')
            
            if not api_key:
                return jsonify({
                    'error': 'ElevenLabs API key not configured'
                }), 500
            
            return jsonify({
                'apiKey': api_key,
                'voiceId': voice_id
            })
            
        except Exception as e:
            return jsonify({
                'error': str(e)
            }), 500