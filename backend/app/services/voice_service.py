import whisper
from elevenlabs.client import ElevenLabs
from elevenlabs import save, VoiceSettings

from app.config import ELEVEN_API_KEY

# Whisper model
model = whisper.load_model("base")

# ElevenLabs client
client = ElevenLabs(api_key=ELEVEN_API_KEY)


def speech_to_text(audio_path):
    result = model.transcribe(audio_path)
    return result["text"]


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