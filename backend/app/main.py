from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import upload, chat, voice, auth
from app.middleware import RequestLoggingMiddleware
import sys

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

app = FastAPI(title="Second Brain AI", version="1.0.0")

@app.on_event("startup")
def on_startup():
    print("Database Startup: Running init_db...")
    try:
        from app.database import engine, SessionLocal
        from app.database import Base
        from app.models import document, chat, user
        from app.models.user import User
        from app.utils.auth import hash_password
        from sqlalchemy import text
        import os

        # Create tables
        Base.metadata.create_all(bind=engine)
        print("Database Startup: Tables created/verified.")

        # Run migrations
        db_migration = SessionLocal()
        try:
            db_migration.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR"))
            db_migration.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR"))
            db_migration.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR DEFAULT 'email'"))
            db_migration.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR"))
            db_migration.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP"))
            db_migration.execute(text("ALTER TABLE chats ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE"))
            db_migration.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE"))
            db_migration.commit()
            print("Database Startup: Migrations completed.")
        except Exception as e:
            print("Database Startup: Migration skipped or failed:", e)
            db_migration.rollback()
        finally:
            db_migration.close()

        # Provision default user
        db = SessionLocal()
        try:
            email = os.getenv("ADMIN_EMAIL", "kethavathnaveennaik1234@gmail.com")
            password = os.getenv("ADMIN_PASSWORD", "Naveen@123//")
            name = os.getenv("ADMIN_NAME", "Naik Naveen")
            
            existing_user = db.query(User).filter(User.email == email).first()
            if not existing_user:
                new_user = User(
                    email=email,
                    hashed_password=hash_password(password),
                    name=name,
                    auth_provider="email",
                    profile_picture="https://api.dicebear.com/7.x/bottts/svg?seed=Archivist",
                    role="user",
                    is_active=True,
                    is_verified=True
                )
                db.add(new_user)
                db.commit()
                print(f"Database Startup: Seeded default user ({email})")
            else:
                existing_user.hashed_password = hash_password(password)
                existing_user.name = name
                existing_user.role = "user"
                db.commit()
                print(f"Database Startup: Updated default user ({email})")
        except Exception as e:
            print("Database Startup: Failed to provision default user:", e)
            db.rollback()
        finally:
            db.close()
    except Exception as startup_err:
        print("Database Startup Fatal Error:", startup_err)

# ── Logging middleware (must be FIRST) ─────────────────────────────────────
app.add_middleware(RequestLoggingMiddleware)

# ── CORS ───────────────────────────────────────────────────────────────────
from app.config import get_allowed_origins
origins = get_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(upload.router,   prefix="/upload",   tags=["Upload"])
app.include_router(chat.router,     prefix="/chat",     tags=["Chat"])
app.include_router(voice.router,    prefix="/voice",    tags=["Voice"])
app.include_router(auth.router)

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