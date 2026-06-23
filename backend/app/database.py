from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import NullPool
from app.config import DATABASE_URL, DB_POOL_PRE_PING, DB_USE_NULLPOOL

engine_kwargs = {}
if DB_USE_NULLPOOL:
    engine_kwargs["poolclass"] = NullPool
else:
    engine_kwargs["pool_pre_ping"] = DB_POOL_PRE_PING

engine = create_engine(DATABASE_URL, **engine_kwargs)

Base = declarative_base()

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