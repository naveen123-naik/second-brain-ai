from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import NullPool
from sqlalchemy.exc import OperationalError
from app.config import DATABASE_URL, DB_POOL_PRE_PING, DB_USE_NULLPOOL

engine_kwargs = {}
if DB_USE_NULLPOOL:
    engine_kwargs["poolclass"] = NullPool
else:
    engine_kwargs["pool_pre_ping"] = DB_POOL_PRE_PING

Base = declarative_base()

# Try connecting to the configured database, fall back to SQLite on error
try:
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL is not set")
    engine = create_engine(DATABASE_URL, **engine_kwargs)
    # Test connection
    with engine.connect() as conn:
        pass
    print("Database Connection: Connected to PostgreSQL successfully.")
except (OperationalError, Exception) as e:
    print(f"Database Connection: Connection to PostgreSQL failed ({e}). Falling back to local SQLite.")
    # For SQLite we need different connection parameters (specifically check_same_thread)
    engine = create_engine(
        "sqlite:///./secondbrain.db",
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# ✅ this was missing
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()