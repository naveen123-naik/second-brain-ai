import os
from dotenv import load_dotenv

load_dotenv()

ENV = os.getenv("ENV", "development").lower()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

ELEVEN_API_KEY = os.getenv("ELEVEN_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

def get_allowed_origins():
    """
    Returns the list of allowed CORS origins based on the current environment.
    """
    if ENV == "production":
        origins = []
    else:
        origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
        ]
    
    frontend_url = os.getenv("FRONTEND_URL")
    if frontend_url:
        if "," in frontend_url:
            origins.extend([o.strip() for o in frontend_url.split(",") if o.strip()])
        else:
            origins.append(frontend_url)
            
    # Return unique values
    return list(set(origins))