import os
from dotenv import load_dotenv
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

print("Keys available:", bool(GROQ_API_KEY), bool(ELEVENLABS_API_KEY))

try:
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    print("Groq Client initialized.")
except Exception as e:
    print("Groq Error:", e)

try:
    import requests
    url = "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM"
    headers = {
      "Accept": "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY
    }
    data = {
      "text": "Hello world from the validation script.",
      "model_id": "eleven_multilingual_v2",
    }
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 200:
        print("Elevenlabs TTS successful, 200 OK.")
    else:
        print("Elevenlabs TTS Failed:", response.status_code, response.text)
except Exception as e:
    print("Elevenlabs Error:", e)
