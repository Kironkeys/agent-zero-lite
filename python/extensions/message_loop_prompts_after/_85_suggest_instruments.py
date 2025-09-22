from python.helpers.extension import Extension
from typing import Any

class SuggestInstruments(Extension):
    """
    Suggests relevant instruments based on message content
    """
    
    async def execute(self, message_content: str = "", **kwargs) -> Any:
        """
        Analyze message and suggest relevant instruments
        """
        if not message_content:
            return
            
        # Keyword to instrument mapping
        instrument_hints = {
            'schedule': 'scheduler instrument available for calendar management',
            'meeting': 'scheduler instrument available for meeting coordination',
            'contact': 'contact_management instrument for CRM operations',
            'chart': 'ghost_ui instrument for creating charts and graphs',
            'graph': 'ghost_ui or graphrag instruments available',
            'approve': 'approval_tool instrument for human-in-the-loop',
            'secret': 'secrets_manager instrument for credential handling',
            'voice': 'voice_manager instrument for TTS features',
            'browser': 'browser instruments for web automation',
            'search': 'search_engine instrument for advanced searches'
        }
        
        # Check for keywords
        message_lower = message_content.lower()
        suggestions = []
        
        for keyword, hint in instrument_hints.items():
            if keyword in message_lower:
                suggestions.append(hint)
        
        # Add suggestions to context if found
        if suggestions:
            hint_text = "\n## Relevant Instruments:\n"
            for suggestion in suggestions[:3]:  # Limit to 3 suggestions
                hint_text += f"- {suggestion}\n"
            hint_text += "Search knowledge for details: memory_search topic='[instrument] instrument'\n"
            
            # Add to system context
            if 'system' in kwargs:
                kwargs['system'].append(hint_text)