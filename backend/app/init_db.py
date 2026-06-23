from app.database import engine, SessionLocal
from app.models import document, chat, user
from app.models.user import User
from app.utils.auth import hash_password
from app.database import Base

from sqlalchemy import text

print("Creating tables...")
Base.metadata.create_all(bind=engine)
print("Tables created.")

print("Running database migrations...")
db_migration = SessionLocal()
try:
    # Add columns to users table
    db_migration.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR"))
    db_migration.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR"))
    db_migration.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR DEFAULT 'email'"))
    db_migration.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR"))
    db_migration.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP"))
    
    # Add user_id column to chats and documents tables
    db_migration.execute(text("ALTER TABLE chats ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE"))
    db_migration.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE"))
    
    db_migration.commit()
    print("Migration: all tables and columns checked/added successfully.")
except Exception as e:
    print("Migration failed or skipped (may already exist or not PostgreSQL):", e)
    db_migration.rollback()
finally:
    db_migration.close()

print("Provisioning default admin account...")
db = SessionLocal()
try:
    admin_email = "kethavathnaveennaik1234@gmail.com"
    existing_admin = db.query(User).filter(User.email == admin_email).first()
    if not existing_admin:
        new_admin = User(
            email=admin_email,
            hashed_password=hash_password("Naveen@123//"),
            name="Naik Naveen",
            auth_provider="email",
            profile_picture="https://api.dicebear.com/7.x/bottts/svg?seed=Archivist",
            role="admin",
            is_active=True,
            is_verified=True
        )
        db.add(new_admin)
        db.commit()
        print(f"Admin account ({admin_email}) provisioned successfully.")
    else:
        # Update password and status in case it was created with different parameters
        existing_admin.hashed_password = hash_password("Naveen@123//")
        existing_admin.name = "Naik Naveen"
        existing_admin.auth_provider = "email"
        if not existing_admin.profile_picture:
            existing_admin.profile_picture = "https://api.dicebear.com/7.x/bottts/svg?seed=Archivist"
        existing_admin.is_active = True
        existing_admin.is_verified = True
        existing_admin.role = "admin"
        db.commit()
        print(f"Admin account ({admin_email}) updated successfully.")
except Exception as e:
    print("Failed to provision admin account:", e)
    db.rollback()
finally:
    db.close()

print("Done")