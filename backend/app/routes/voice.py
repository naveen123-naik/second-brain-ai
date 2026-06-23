import os
import base64
import io
import requests
from fastapi import APIRouter, UploadFile, File, Depends
from pydantic import BaseModel
from app.rag.pipeline import ask_ai
from app.utils.auth import get_verified_user
from app.models.user import User
from groq import Groq
from gtts import gTTS
from app.config import GROQ_API_KEY

router = APIRouter()

client = Groq(api_key=GROQ_API_KEY)


import re

class TTSRequest(BaseModel):
    text: str


def detect_language_code(text: str) -> tuple[str, str]:
    """
    Detects the language code and top-level domain (tld) for gTTS
    based on character set matches.
    Returns (lang_code, tld)
    """
    # Check for Tamil script
    if re.search(r'[\u0b80-\u0bff]', text):
        return 'ta', 'com'
    # Check for Telugu script
    if re.search(r'[\u0c00-\u0c7f]', text):
        return 'te', 'com'
    # Check for Devanagari script (Hindi, Marathi, etc.)
    if re.search(r'[\u0900-\u097f]', text):
        return 'hi', 'com'
    # Check for Kannada script
    if re.search(r'[\u0c80-\u0cff]', text):
        return 'kn', 'com'
    # Check for Malayalam script
    if re.search(r'[\u0d00-\u0d7f]', text):
        return 'ml', 'com'
    # Check for Bengali script
    if re.search(r'[\u0980-\u09ff]', text):
        return 'bn', 'com'
    
    # Default is English with an Indian accent tld (Indian Female accent)
    return 'en', 'co.in'


def generate_tts_audio(text: str) -> str:
    """
    Generates TTS audio using ElevenLabs (if API key is present) or gTTS (fallback)
    and returns a base64-encoded MP3/audio string.
    """
    if not text or not text.strip():
        return ""

    elevenlabs_key = os.getenv("ELEVENLABS_API_KEY")
    if elevenlabs_key:
        url = "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM"  # Rachel Voice
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": elevenlabs_key
        }
        data = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        try:
            response = requests.post(url, json=data, headers=headers)
            if response.status_code == 200:
                return base64.b64encode(response.content).decode("utf-8")
            else:
                print("[TTS Warning] ElevenLabs failed:", response.text)
        except Exception as e:
            print("[TTS Warning] ElevenLabs request exception:", e)

    # Fallback to gTTS if no ElevenLabs key or request failed
    print("[TTS Warning] ELEVENLABS_API_KEY not found or ElevenLabs failed. Falling back to gTTS.")
    try:
        lang_code, tld = detect_language_code(text)
        print(f"[gTTS] Speaking text in lang_code={lang_code}, tld={tld}")
        tts = gTTS(text=text, lang=lang_code, tld=tld)
        audio_fp = io.BytesIO()
        tts.write_to_fp(audio_fp)
        audio_fp.seek(0)
        return base64.b64encode(audio_fp.read()).decode("utf-8")
    except Exception as e:
        print("[TTS Error] gTTS failed:", e)
        return ""


@router.post("/tts")
async def text_to_speech(request: TTSRequest, current_user: User = Depends(get_verified_user)):
    audio_base64 = generate_tts_audio(request.text)
    return {"audio_base64": audio_base64}


@router.post("/conversation")
async def voice_conversation(file: UploadFile = File(...), current_user: User = Depends(get_verified_user)):
    # 1. Save uploaded audio temporarily
    temp_audio_path = f"temp_{current_user.id}_{file.filename}"
    with open(temp_audio_path, "wb") as f:
        f.write(await file.read())
        
    try:
        # 2. Transcribe audio using Whisper (Groq API)
        with open(temp_audio_path, "rb") as audio_file:
            audio_bytes = audio_file.read()
            
        debug_info = f"Audio size: {len(audio_bytes)} bytes. "
        
        # If the audio is too small (e.g., quick click), it will crash the Groq API.
        if len(audio_bytes) < 100:
            transcript = ""
            debug_info += "File too small."
        else:
            try:
                # Groq audio transcription requires an open file object
                with open(temp_audio_path, "rb") as af:
                    transcript_response = client.audio.transcriptions.create(
                        model="whisper-large-v3",
                        file=("recording.webm", af.read())
                    )
                transcript = transcript_response.text
            except Exception as stt_e:
                print(f"[STT Warning] Could not process audio file: {stt_e}")
                transcript = ""
                debug_info += f"STT Error: {str(stt_e)}"

        # 3. Handle based on input source (mic vs uploaded file)
        is_mic = file.filename.startswith("recording") or file.filename == "voice.wav"
        
        if is_mic:
            # Mic input workflow: short, conversational, instant TTS
            if not transcript or not transcript.strip():
                answer = f"I didn't quite catch that. Could you please repeat? [Debug: {debug_info}]"
            else:
                chat_completion = client.chat.completions.create(
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a real-time conversational voice assistant. Immediately respond naturally to the user. Keep responses short, clear, and conversational for voice mode. Do not use markdown formatting, bolding, or lists."
                        },
                        {
                            "role": "user",
                            "content": transcript
                        }
                    ],
                    model="llama-3.3-70b-versatile",
                    max_tokens=2048
                )
                answer = chat_completion.choices[0].message.content
            
            if not answer or not answer.strip():
                answer = "I'm sorry, I couldn't formulate a response."

            # Generate TTS audio
            audio_base64 = generate_tts_audio(answer)
        else:
            # Uploaded audio file workflow: answer normally in text, optional voice (disabled by default)
            answer = ask_ai(current_user.id, transcript)
            audio_base64 = ""
            
        return {
            "transcript": transcript,
            "answer": answer,
            "audio_base64": audio_base64
        }
    except Exception as e:
        print("[Voice Error]", e)
        import traceback
        with open("error.log", "a") as err_file:
            err_file.write(f"Error: {e}\nTraceback:\n{traceback.format_exc()}\n")
        return {"transcript": "STT Pipeline failure.", "answer": "The AI context engine encountered an error. Check console logs.", "audio_base64": ""}
    finally:
        # Cleanup temp file
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)