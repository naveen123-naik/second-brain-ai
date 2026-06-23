from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL)

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