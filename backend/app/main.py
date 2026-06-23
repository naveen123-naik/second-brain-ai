from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import upload, chat, voice, email, calendar, auth, admin
from app.middleware import RequestLoggingMiddleware
import sys

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

app = FastAPI(title="Second Brain AI", version="1.0.0")

# ── Logging middleware (must be FIRST) ─────────────────────────────────────
app.add_middleware(RequestLoggingMiddleware)

# ── CORS ───────────────────────────────────────────────────────────────────
from app.config import get_allowed_origins
origins = get_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(upload.router,   prefix="/upload",   tags=["Upload"])
app.include_router(chat.router,     prefix="/chat",     tags=["Chat"])
app.include_router(voice.router,    prefix="/voice",    tags=["Voice"])
app.include_router(email.router,    prefix="/email",    tags=["Email"])
app.include_router(calendar.router, prefix="/calendar", tags=["Calendar"])
app.include_router(auth.router)
app.include_router(admin.router)

# ── Custom Error Logging Exception Handlers ─────────────────────────────────
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.logger import logger
from fastapi.responses import JSONResponse

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    client_ip = request.client.host if request.client else "unknown"
    logger.warning(
        f"HTTP {exc.status_code} error: {exc.detail} | "
        f"Path: {request.url.path} | "
        f"Method: {request.method} | "
        f"IP: {client_ip}"
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    client_ip = request.client.host if request.client else "unknown"
    logger.warning(
        f"Validation error: {exc.errors()} | "
        f"Path: {request.url.path} | "
        f"Method: {request.method} | "
        f"IP: {client_ip}"
    )
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )





@app.get("/")
def home():
    return {"message": "Second Brain AI Backend Running", "status": "ok"}