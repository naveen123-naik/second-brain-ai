import os
from groq import Groq
from elevenlabs.client import ElevenLabs
from elevenlabs import save, VoiceSettings

from app.config import ELEVEN_API_KEY, GROQ_API_KEY

# Groq client for Whisper STT
groq_client = Groq(api_key=GROQ_API_KEY)

# ElevenLabs client
client = ElevenLabs(api_key=ELEVEN_API_KEY)


def speech_to_text(audio_path):
    """
    Transcribe audio to text using the Groq Whisper API instead of a local Whisper model
    to save storage and memory resources.
    """
    if not os.path.exists(audio_path):
        print(f"[STT Error] Audio file not found: {audio_path}")
        return ""

    try:
        with open(audio_path, "rb") as af:
            transcript_response = groq_client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=(os.path.basename(audio_path), af.read())
            )
        return transcript_response.text
    except Exception as e:
        print(f"[STT Error] Failed to transcribe audio via Groq API: {e}")
        return ""


def text_to_speech(text):

    audio = client.text_to_speech.convert(
        voice_id="RABOvaPec1ymXz02oDQi",
        model_id="eleven_multilingual_v2",
        text=text,
        voice_settings=VoiceSettings(
            stability=0.71,
            similarity_boost=0.85,
            style=0.0,
            use_speaker_boost=True
        )
    )

    output_path = "output.mp3"
    save(audio, output_path)

    return output_path