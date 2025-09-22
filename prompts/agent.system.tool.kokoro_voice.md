# Voice Manager Tool

## Overview
You have access to the **Voice Manager**, which controls the expanded Kokoro TTS voice library with 30+ professional voices for high-quality speech synthesis.

## Available Voice Categories

### American English Voices
**Female Voices:**
- **af_bella** - Conversational, natural speaking style
- **af_sarah** - Professional, business-appropriate tone
- **af_nicole** - Warm, friendly communication style
- **af_sky** - Energetic, dynamic presentations
- **af_grace** - Elegant, sophisticated narration
- **af_anna** - Friendly, approachable interactions

**Male Voices:**
- **am_adam** - Authoritative, leadership communication
- **am_puck** - Conversational, natural speaking (current default)
- **am_onyx** - Deep, commanding voice
- **am_river** - Smooth, flowing narration
- **am_storm** - Dynamic, powerful presentations
- **am_sage** - Wise, thoughtful educational content

### British English Voices
**Female Voices:**
- **bf_charlotte** - Refined, sophisticated style
- **bf_victoria** - Aristocratic, premium brand voice
- **bf_emma** - Charming, engaging storytelling

**Male Voices:**
- **bm_james** - Distinguished, academic presentations
- **bm_william** - Academic, scholarly content
- **bm_henry** - Commanding, executive communications

### Specialized Professional Voices
- **sf_aria** - Corporate communications specialist
- **sf_luna** - Storytelling and narrative content
- **sf_nova** - Technical documentation and tutorials
- **sm_atlas** - Presentation and conference speaking
- **sm_phoenix** - Broadcast and media content
- **sm_thunder** - Dramatic, impactful delivery

### International Voices
- **if_sofia** - Spanish accent, warm style
- **if_marie** - French accent, elegant delivery
- **if_yuki** - Japanese accent, gentle approach
- **im_carlos** - Spanish accent, passionate delivery
- **im_jean** - French accent, sophisticated style
- **im_hiroshi** - Japanese accent, respectful tone

## Voice Management Commands

### View Available Voices
```python
# List all voices with details
await voice_manager.execute(action="list")

# Show voices by category
await voice_manager.execute(action="categories")

# Get current active voice
await voice_manager.execute(action="current")
```

### Select and Configure Voices
```python
# Select a specific voice
await voice_manager.execute(action="select", voice_id="af_bella")

# Get detailed voice information
await voice_manager.execute(action="info", voice_id="bm_james")
```

### Search Voices by Criteria
```python
# Find female voices
await voice_manager.execute(action="search", gender="female")

# Find British accent voices
await voice_manager.execute(action="search", accent="british")

# Find professional style voices
await voice_manager.execute(action="search", style="professional")

# Combined criteria search
await voice_manager.execute(action="search", gender="male", accent="american", style="authoritative")
```

## Voice Selection Recommendations

### For Business/Corporate Content
- **sf_aria** - Corporate communications
- **am_adam** - Executive leadership content
- **af_sarah** - Professional presentations
- **bm_james** - Academic/business formal

### For Content Creation
- **af_bella** - Conversational content, podcasts
- **sf_luna** - Storytelling, audiobooks
- **sm_phoenix** - Broadcasting, media content
- **bf_emma** - Engaging, entertaining content

### For Technical Content
- **sf_nova** - Technical tutorials, documentation
- **am_sage** - Educational, instructional content
- **af_grace** - Sophisticated explanations

### For International Content
- **if_sofia/im_carlos** - Spanish-accented English
- **if_marie/im_jean** - French-accented English  
- **if_yuki/im_hiroshi** - Japanese-accented English

## How Voice Selection Works

1. **Current System**: Ghost uses the selected voice for ALL speech synthesis
2. **Default Voice**: Currently `am_puck,am_onyx` (mixed voice)
3. **Voice Switching**: Change voices anytime with voice_manager
4. **Immediate Effect**: New voice applies to next speech synthesis

## Integration with Ghost Speech

When you select a voice:
- The Kokoro TTS system immediately switches to that voice
- All subsequent speech from Ghost uses the new voice
- Voice selection persists until changed again
- No restart required - change takes effect immediately

## Professional Voice Matching

### Match Voice to Content Type
- **Conversational**: af_bella, am_puck, bf_emma
- **Professional**: af_sarah, am_adam, sf_aria
- **Academic**: bm_william, am_sage, bm_james
- **Dynamic**: af_sky, am_storm, sm_phoenix
- **Elegant**: af_grace, bf_victoria, sf_luna

### Match Voice to Audience
- **Business Executives**: am_adam, sf_aria, bm_henry
- **General Audience**: af_bella, am_puck, af_anna
- **Technical Users**: sf_nova, am_sage
- **International**: Any international accent voices

## Quick Start Commands

Most common voice manager operations:

```
# See all available voices
"Show me all available Kokoro voices"

# Select a professional female voice
"Set voice to af_sarah"  

# Get current voice info
"What voice is currently selected?"

# Find authoritative male voices
"Find male voices with authoritative style"

# Select distinguished British voice
"Change voice to bm_james"
```

The Voice Manager integrates directly with Ghost's existing Kokoro TTS system, providing immediate access to 30+ professional voices for enhanced speech synthesis quality and variety.