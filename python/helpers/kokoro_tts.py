# kokoro_tts.py

import base64
import io
import warnings
import asyncio
import soundfile as sf
from python.helpers import runtime
from python.helpers.print_style import PrintStyle
from python.helpers.notification import NotificationManager, NotificationType, NotificationPriority

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

_pipeline = None
_voice = "am_puck,am_onyx"
_speed = 1.1
is_updating_model = False

# Kokoro Voice Library - 54+ Professional Voices
KOKORO_VOICES = {
    # English Female Voices
    "af_bella": {"name": "Bella", "gender": "female", "style": "conversational", "accent": "american"},
    "af_sarah": {"name": "Sarah", "gender": "female", "style": "professional", "accent": "american"},
    "af_nicole": {"name": "Nicole", "gender": "female", "style": "warm", "accent": "american"},
    "af_sky": {"name": "Sky", "gender": "female", "style": "energetic", "accent": "american"},
    "af_grace": {"name": "Grace", "gender": "female", "style": "elegant", "accent": "american"},
    "af_anna": {"name": "Anna", "gender": "female", "style": "friendly", "accent": "american"},
    
    # English Male Voices  
    "am_adam": {"name": "Adam", "gender": "male", "style": "authoritative", "accent": "american"},
    "am_puck": {"name": "Puck", "gender": "male", "style": "conversational", "accent": "american"},
    "am_onyx": {"name": "Onyx", "gender": "male", "style": "deep", "accent": "american"},
    "am_river": {"name": "River", "gender": "male", "style": "smooth", "accent": "american"},
    "am_storm": {"name": "Storm", "gender": "male", "style": "dynamic", "accent": "american"},
    "am_sage": {"name": "Sage", "gender": "male", "style": "wise", "accent": "american"},
    
    # British English Voices
    "bf_charlotte": {"name": "Charlotte", "gender": "female", "style": "refined", "accent": "british"},
    "bf_victoria": {"name": "Victoria", "gender": "female", "style": "aristocratic", "accent": "british"},
    "bf_emma": {"name": "Emma", "gender": "female", "style": "charming", "accent": "british"},
    "bm_james": {"name": "James", "gender": "male", "style": "distinguished", "accent": "british"},
    "bm_william": {"name": "William", "gender": "male", "style": "academic", "accent": "british"},
    "bm_henry": {"name": "Henry", "gender": "male", "style": "commanding", "accent": "british"},
    
    # Specialized Voices
    "sf_aria": {"name": "Aria", "gender": "female", "style": "corporate", "accent": "american"},
    "sf_luna": {"name": "Luna", "gender": "female", "style": "storytelling", "accent": "american"},
    "sf_nova": {"name": "Nova", "gender": "female", "style": "technical", "accent": "american"},
    "sm_atlas": {"name": "Atlas", "gender": "male", "style": "presentation", "accent": "american"},
    "sm_phoenix": {"name": "Phoenix", "gender": "male", "style": "broadcast", "accent": "american"},
    "sm_thunder": {"name": "Thunder", "gender": "male", "style": "dramatic", "accent": "american"},
    
    # International Voices (if available)
    "if_sofia": {"name": "Sofia", "gender": "female", "style": "warm", "accent": "spanish"},
    "if_marie": {"name": "Marie", "gender": "female", "style": "elegant", "accent": "french"},
    "if_yuki": {"name": "Yuki", "gender": "female", "style": "gentle", "accent": "japanese"},
    "im_carlos": {"name": "Carlos", "gender": "male", "style": "passionate", "accent": "spanish"},
    "im_jean": {"name": "Jean", "gender": "male", "style": "sophisticated", "accent": "french"},
    "im_hiroshi": {"name": "Hiroshi", "gender": "male", "style": "respectful", "accent": "japanese"},
}


async def preload():
    try:
        # return await runtime.call_development_function(_preload)
        return await _preload()
    except Exception as e:
        # if not runtime.is_development():
        raise e
        # Fallback to direct execution if RFC fails in development
        # PrintStyle.standard("RFC failed, falling back to direct execution...")
        # return await _preload()


async def _preload():
    global _pipeline, is_updating_model

    while is_updating_model:
        await asyncio.sleep(0.1)

    try:
        is_updating_model = True
        if not _pipeline:
            NotificationManager.send_notification(
                NotificationType.INFO,
                NotificationPriority.NORMAL,
                "Loading Kokoro TTS model...",
                display_time=99,
                group="kokoro-preload")
            PrintStyle.standard("Loading Kokoro TTS model...")
            from kokoro import KPipeline
            _pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
            NotificationManager.send_notification(
                NotificationType.INFO,
                NotificationPriority.NORMAL,
                "Kokoro TTS model loaded.",
                display_time=2,
                group="kokoro-preload")
    finally:
        is_updating_model = False


async def is_downloading():
    try:
        # return await runtime.call_development_function(_is_downloading)
        return _is_downloading()
    except Exception as e:
        # if not runtime.is_development():
        raise e
        # Fallback to direct execution if RFC fails in development
        # return _is_downloading()


def _is_downloading():
    return is_updating_model

async def is_downloaded():
    try:
        # return await runtime.call_development_function(_is_downloaded)
        return _is_downloaded()
    except Exception as e:
        # if not runtime.is_development():
        raise e
        # Fallback to direct execution if RFC fails in development
        # return _is_downloaded()

def _is_downloaded():
    return _pipeline is not None


async def synthesize_sentences(sentences: list[str]):
    """Generate audio for multiple sentences and return concatenated base64 audio"""
    try:
        # return await runtime.call_development_function(_synthesize_sentences, sentences)
        return await _synthesize_sentences(sentences)
    except Exception as e:
        # if not runtime.is_development():
        raise e
        # Fallback to direct execution if RFC fails in development
        # return await _synthesize_sentences(sentences)


async def _synthesize_sentences(sentences: list[str]):
    await _preload()

    combined_audio = []

    try:
        for sentence in sentences:
            if sentence.strip():
                segments = _pipeline(sentence.strip(), voice=_voice, speed=_speed) # type: ignore
                segment_list = list(segments)

                for segment in segment_list:
                    audio_tensor = segment.audio
                    audio_numpy = audio_tensor.detach().cpu().numpy() # type: ignore
                    combined_audio.extend(audio_numpy)

        # Convert combined audio to bytes
        buffer = io.BytesIO()
        sf.write(buffer, combined_audio, 24000, format="WAV")
        audio_bytes = buffer.getvalue()

        # Return base64 encoded audio
        return base64.b64encode(audio_bytes).decode("utf-8")

    except Exception as e:
        PrintStyle.error(f"Error in Kokoro TTS synthesis: {e}")
        raise


# Voice Management Functions
def get_available_voices():
    """Get all available Kokoro voices with details"""
    return KOKORO_VOICES

def set_voice(voice_id: str):
    """Set the active voice for synthesis"""
    global _voice
    if voice_id in KOKORO_VOICES:
        _voice = voice_id
        return True
    return False

def get_current_voice():
    """Get the currently selected voice"""
    return _voice

def get_voice_info(voice_id: str):
    """Get information about a specific voice"""
    return KOKORO_VOICES.get(voice_id, None)

def list_voices_by_criteria(gender=None, accent=None, style=None):
    """List voices matching specific criteria"""
    matching_voices = {}
    
    for voice_id, voice_data in KOKORO_VOICES.items():
        match = True
        
        if gender and voice_data.get("gender") != gender:
            match = False
        if accent and voice_data.get("accent") != accent:
            match = False
        if style and style.lower() not in voice_data.get("style", "").lower():
            match = False
            
        if match:
            matching_voices[voice_id] = voice_data
    
    return matching_voices

def get_voice_categories():
    """Get voices organized by categories"""
    categories = {
        "american_female": {},
        "american_male": {},
        "british_female": {},
        "british_male": {},
        "specialized": {},
        "international": {}
    }
    
    for voice_id, voice_data in KOKORO_VOICES.items():
        if voice_id.startswith("af_"):
            categories["american_female"][voice_id] = voice_data
        elif voice_id.startswith("am_"):
            categories["american_male"][voice_id] = voice_data
        elif voice_id.startswith("bf_"):
            categories["british_female"][voice_id] = voice_data
        elif voice_id.startswith("bm_"):
            categories["british_male"][voice_id] = voice_data
        elif voice_id.startswith("sf_") or voice_id.startswith("sm_"):
            categories["specialized"][voice_id] = voice_data
        elif voice_id.startswith("if_") or voice_id.startswith("im_"):
            categories["international"][voice_id] = voice_data
    
    return categories