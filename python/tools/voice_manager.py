from python.helpers.tool import Tool, Response
from python.helpers import kokoro_tts
import json
from datetime import datetime

class VoiceManager(Tool):
    """
    Kokoro Voice Management Tool - Control the 30+ professional voices
    available in the Kokoro TTS system for high-quality speech synthesis.
    """
    
    def __init__(self, agent, **kwargs):
        super().__init__(agent, **kwargs)
        
    async def execute(self, action="list", voice_id="", criteria=None, **kwargs):
        """
        Manage Kokoro TTS voices
        
        Parameters:
        - action: list, select, current, info, categories, search
        - voice_id: Specific voice ID to use/query
        - criteria: Search criteria (gender, accent, style)
        """
        
        try:
            if action == "list":
                return await self._list_all_voices()
            
            elif action == "select":
                if not voice_id:
                    return Response(
                        message="❌ voice_id is required for selection",
                        break_loop=False
                    )
                return await self._select_voice(voice_id)
            
            elif action == "current":
                return await self._get_current_voice()
            
            elif action == "info":
                if not voice_id:
                    return Response(
                        message="❌ voice_id is required for info",
                        break_loop=False
                    )
                return await self._get_voice_info(voice_id)
            
            elif action == "categories":
                return await self._show_voice_categories()
            
            elif action == "search":
                return await self._search_voices(criteria or kwargs)
            
            else:
                return await self._show_voice_help()
                
        except Exception as e:
            return Response(
                message=f"Voice Manager error: {str(e)}",
                break_loop=False
            )
    
    async def _list_all_voices(self):
        """List all available Kokoro voices"""
        voices = kokoro_tts.get_available_voices()
        current_voice = kokoro_tts.get_current_voice()
        
        report = f"""
🎭 **Kokoro Voice Library** ({len(voices)} Professional Voices)

**Current Voice**: {current_voice} ✅
**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Available Voices

"""
        
        categories = kokoro_tts.get_voice_categories()
        
        for category, category_voices in categories.items():
            if not category_voices:
                continue
                
            category_name = category.replace("_", " ").title()
            report += f"""
### {category_name} ({len(category_voices)} voices)
"""
            
            for voice_id, voice_data in category_voices.items():
                current_marker = "🔊" if voice_id == current_voice else "  "
                style_desc = voice_data['style'].title()
                
                report += f"""
{current_marker} **{voice_data['name']}** (`{voice_id}`)
   Style: {style_desc} | Accent: {voice_data['accent'].title()}
"""
        
        report += f"""
## Quick Commands

**Select a voice**: `select voice_id` 
Example: `voice_manager select af_bella`

**Get voice details**: `info voice_id`
Example: `voice_manager info am_adam`

**Search voices**: `search criteria`  
Example: `voice_manager search gender=female accent=british`

**Show categories**: `voice_manager categories`

**Total Voices**: {len(voices)} professional options available
**System**: Ready for voice synthesis ✅
"""
        
        return Response(message=report, break_loop=False)
    
    async def _select_voice(self, voice_id):
        """Select a specific voice for TTS"""
        
        voice_info = kokoro_tts.get_voice_info(voice_id)
        if not voice_info:
            available = list(kokoro_tts.get_available_voices().keys())[:10]
            return Response(
                message=f"❌ Voice '{voice_id}' not found. Available voices: {', '.join(available)}...",
                break_loop=False
            )
        
        success = kokoro_tts.set_voice(voice_id)
        if not success:
            return Response(
                message=f"❌ Failed to set voice '{voice_id}'",
                break_loop=False
            )
        
        report = f"""
🔊 **Voice Selected: {voice_info['name']}**

**Voice ID**: `{voice_id}`
**Gender**: {voice_info['gender'].title()}
**Style**: {voice_info['style'].title()}
**Accent**: {voice_info['accent'].title()}

## Voice Characteristics
• **Best For**: {self._get_voice_use_cases(voice_info['style'])}
• **Personality**: {self._get_voice_personality(voice_info['style'])}
• **Professional Level**: {self._get_professional_level(voice_info['style'])}

**Voice activated** ✅ 
The next speech synthesis will use **{voice_info['name']}**.

**Test the voice**: Ask Ghost to speak any text and it will use this voice.
**Change voice**: Use `voice_manager select [voice_id]` anytime.
"""
        
        return Response(message=report, break_loop=False)
    
    async def _get_current_voice(self):
        """Show currently selected voice"""
        current_voice = kokoro_tts.get_current_voice()
        voice_info = kokoro_tts.get_voice_info(current_voice)
        
        if not voice_info:
            return Response(
                message=f"Current voice: {current_voice} (legacy format)",
                break_loop=False
            )
        
        report = f"""
🔊 **Current Voice: {voice_info['name']}**

**Voice ID**: `{current_voice}`
**Gender**: {voice_info['gender'].title()}  
**Style**: {voice_info['style'].title()}
**Accent**: {voice_info['accent'].title()}

## Voice Profile
• **Personality**: {self._get_voice_personality(voice_info['style'])}
• **Best Applications**: {self._get_voice_use_cases(voice_info['style'])}
• **Professional Rating**: {self._get_professional_level(voice_info['style'])}

**Status**: Active and ready for synthesis ✅

**Change voice**: Use `voice_manager select [voice_id]`
**Browse voices**: Use `voice_manager list`
"""
        
        return Response(message=report, break_loop=False)
    
    async def _get_voice_info(self, voice_id):
        """Get detailed information about a specific voice"""
        voice_info = kokoro_tts.get_voice_info(voice_id)
        
        if not voice_info:
            return Response(
                message=f"❌ Voice '{voice_id}' not found",
                break_loop=False
            )
        
        current_voice = kokoro_tts.get_current_voice()
        is_current = voice_id == current_voice
        
        report = f"""
📋 **Voice Profile: {voice_info['name']}**

**Voice ID**: `{voice_id}`
**Status**: {"🔊 Currently Active" if is_current else "Available"}

## Basic Information
• **Name**: {voice_info['name']}
• **Gender**: {voice_info['gender'].title()}
• **Accent**: {voice_info['accent'].title()}
• **Style**: {voice_info['style'].title()}

## Detailed Characteristics
• **Personality**: {self._get_voice_personality(voice_info['style'])}
• **Best Applications**: {self._get_voice_use_cases(voice_info['style'])}
• **Professional Level**: {self._get_professional_level(voice_info['style'])}
• **Recommended Context**: {self._get_recommended_context(voice_info['style'])}

## Usage Recommendations
• **Ideal For**: {self._get_ideal_for(voice_info)}
• **Avoid For**: {self._get_avoid_for(voice_info)}

{'**Currently in use** ✅' if is_current else '**To activate**: `voice_manager select ' + voice_id + '`'}
"""
        
        return Response(message=report, break_loop=False)
    
    async def _show_voice_categories(self):
        """Show voices organized by categories"""
        categories = kokoro_tts.get_voice_categories()
        current_voice = kokoro_tts.get_current_voice()
        
        report = f"""
📂 **Kokoro Voice Categories**

**Current Voice**: {current_voice}

"""
        
        category_descriptions = {
            "american_female": "🇺🇸 American female voices - versatile and clear",
            "american_male": "🇺🇸 American male voices - authoritative and smooth",
            "british_female": "🇬🇧 British female voices - refined and elegant",
            "british_male": "🇬🇧 British male voices - distinguished and academic",
            "specialized": "✨ Specialized voices - unique styles and applications",
            "international": "🌍 International voices - multilingual options"
        }
        
        for category, voices in categories.items():
            if not voices:
                continue
                
            description = category_descriptions.get(category, "")
            category_name = category.replace("_", " ").title()
            
            report += f"""
## {category_name} ({len(voices)})
{description}

"""
            
            for voice_id, voice_data in list(voices.items())[:5]:  # Show first 5
                current_marker = "🔊" if voice_id == current_voice else "  "
                report += f"{current_marker} **{voice_data['name']}** (`{voice_id}`) - {voice_data['style'].title()}\n"
            
            if len(voices) > 5:
                report += f"  ... and {len(voices) - 5} more voices\n"
            
            report += "\n"
        
        report += """
**To select any voice**: `voice_manager select [voice_id]`
**For full list**: `voice_manager list`
**Search voices**: `voice_manager search gender=female`
"""
        
        return Response(message=report, break_loop=False)
    
    async def _search_voices(self, criteria):
        """Search voices by criteria"""
        
        gender = criteria.get("gender")
        accent = criteria.get("accent") 
        style = criteria.get("style")
        
        matching_voices = kokoro_tts.list_voices_by_criteria(gender, accent, style)
        current_voice = kokoro_tts.get_current_voice()
        
        search_terms = []
        if gender:
            search_terms.append(f"Gender: {gender}")
        if accent:
            search_terms.append(f"Accent: {accent}")
        if style:
            search_terms.append(f"Style: {style}")
        
        report = f"""
🔍 **Voice Search Results**

**Search Criteria**: {', '.join(search_terms) if search_terms else 'All voices'}
**Matches Found**: {len(matching_voices)}

"""
        
        if not matching_voices:
            report += """
❌ **No voices found matching criteria**

**Available Options**:
• **Gender**: female, male
• **Accent**: american, british, spanish, french, japanese
• **Style**: conversational, professional, authoritative, warm, etc.

**Try broader search**: `voice_manager search gender=female`
"""
        else:
            for voice_id, voice_data in list(matching_voices.items())[:10]:
                current_marker = "🔊" if voice_id == current_voice else "  "
                report += f"""
{current_marker} **{voice_data['name']}** (`{voice_id}`)
   {voice_data['gender'].title()} | {voice_data['accent'].title()} | {voice_data['style'].title()}
   Best for: {self._get_voice_use_cases(voice_data['style'])}
"""
            
            if len(matching_voices) > 10:
                report += f"\n... and {len(matching_voices) - 10} more matches\n"
        
        report += """
**To select**: `voice_manager select [voice_id]`
**More details**: `voice_manager info [voice_id]`
"""
        
        return Response(message=report, break_loop=False)
    
    async def _show_voice_help(self):
        """Show voice manager help"""
        current_voice = kokoro_tts.get_current_voice()
        total_voices = len(kokoro_tts.get_available_voices())
        
        return Response(message=f"""
🎭 **Kokoro Voice Manager Help**

**Current Voice**: {current_voice}
**Available Voices**: {total_voices}

## Commands Available

### Voice Management
• `voice_manager list` - Show all voices
• `voice_manager select [voice_id]` - Choose a voice
• `voice_manager current` - Show active voice
• `voice_manager categories` - Browse by category

### Voice Information  
• `voice_manager info [voice_id]` - Voice details
• `voice_manager search gender=female` - Find voices
• `voice_manager search accent=british` - Filter by accent
• `voice_manager search style=professional` - Filter by style

### Popular Voices
• **af_bella** - Conversational female
• **am_adam** - Authoritative male  
• **bf_charlotte** - Refined British female
• **bm_james** - Distinguished British male
• **sf_aria** - Corporate specialist

## How It Works
1. **Select Voice**: Choose from {total_voices} professional voices
2. **Ghost Uses Voice**: All speech synthesis uses selected voice
3. **Change Anytime**: Switch voices with simple commands

**Ready to enhance your Ghost experience with professional voices** 🎯
""", break_loop=False)
    
    def _get_voice_use_cases(self, style):
        """Get use cases based on voice style"""
        use_cases = {
            "conversational": "Casual chat, podcasts, friendly content",
            "professional": "Business presentations, corporate communications", 
            "authoritative": "Leadership content, executive communications",
            "warm": "Customer service, welcoming messages",
            "energetic": "Marketing content, upbeat presentations",
            "elegant": "Luxury brand content, sophisticated narration",
            "friendly": "Social content, community interactions",
            "deep": "Dramatic narration, authoritative announcements",
            "smooth": "Radio-style content, smooth narration",
            "dynamic": "Sales presentations, motivational content",
            "wise": "Educational content, mentoring",
            "refined": "High-end brand content, premium services",
            "aristocratic": "Luxury brands, exclusive content",
            "charming": "Entertainment, engaging storytelling",
            "distinguished": "Academic content, formal presentations",
            "academic": "Educational material, scholarly content",
            "commanding": "Leadership messages, important announcements",
            "corporate": "Business training, corporate videos",
            "storytelling": "Audiobooks, narrative content",
            "technical": "Software tutorials, technical documentation",
            "presentation": "Conferences, formal presentations",
            "broadcast": "News, professional broadcasting",
            "dramatic": "Entertainment, theatrical content"
        }
        return use_cases.get(style, "General purpose communications")
    
    def _get_voice_personality(self, style):
        """Get personality description for voice style"""
        personalities = {
            "conversational": "Friendly, approachable, natural",
            "professional": "Polished, competent, trustworthy",
            "authoritative": "Confident, commanding, decisive",
            "warm": "Caring, welcoming, compassionate",
            "energetic": "Dynamic, enthusiastic, motivating",
            "elegant": "Sophisticated, graceful, refined",
            "wise": "Thoughtful, experienced, knowledgeable",
            "smooth": "Calming, flowing, pleasant"
        }
        return personalities.get(style, "Balanced, professional")
    
    def _get_professional_level(self, style):
        """Get professional level rating"""
        levels = {
            "corporate": "Executive Level",
            "professional": "Business Professional", 
            "authoritative": "Leadership Level",
            "academic": "Scholarly",
            "presentation": "Conference Quality",
            "broadcast": "Studio Quality"
        }
        return levels.get(style, "Professional Standard")
    
    def _get_recommended_context(self, style):
        """Get recommended usage context"""
        contexts = {
            "conversational": "Informal settings, casual interactions",
            "professional": "Business environments, formal communications",
            "authoritative": "Leadership contexts, important announcements",
            "corporate": "Business training, company communications",
            "academic": "Educational settings, scholarly content"
        }
        return contexts.get(style, "General professional use")
    
    def _get_ideal_for(self, voice_info):
        """Get ideal use cases combining multiple attributes"""
        style = voice_info['style']
        gender = voice_info['gender']
        accent = voice_info['accent']
        
        base_cases = self._get_voice_use_cases(style)
        
        # Add context based on accent
        if accent == "british":
            return f"{base_cases}, International business, Premium brands"
        elif accent == "american":
            return f"{base_cases}, North American markets, Tech companies"
        else:
            return f"{base_cases}, Multilingual content, Global audiences"
    
    def _get_avoid_for(self, voice_info):
        """Get contexts to avoid for this voice"""
        style = voice_info['style']
        
        avoid_cases = {
            "dramatic": "Technical documentation, legal disclaimers",
            "energetic": "Meditation content, formal legal content",
            "corporate": "Children's content, casual social media",
            "aristocratic": "Casual gaming content, informal tutorials"
        }
        
        return avoid_cases.get(style, "Mismatched emotional contexts")