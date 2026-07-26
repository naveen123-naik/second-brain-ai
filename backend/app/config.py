import os
from dotenv import load_dotenv

load_dotenv()

ENV = os.getenv("ENV", "development").lower()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

DB_POOL_PRE_PING = os.getenv("DB_POOL_PRE_PING", "True").lower() == "true"
DB_USE_NULLPOOL = os.getenv("DB_USE_NULLPOOL", "False").lower() == "true"

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

ELEVEN_API_KEY = os.getenv("ELEVEN_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

def get_allowed_origins():
    """
    Returns the list of allowed CORS origins based on the current environment.
    """
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8001",
    ]
    
    frontend_url = os.getenv("FRONTEND_URL")
    if frontend_url:
        for url in frontend_url.split(","):
            cleaned = url.strip().rstrip("/")
            if cleaned:
                origins.append(cleaned)
                origins.append(f"{cleaned}/")
            
    # Return unique values
    return list(set(origins))
