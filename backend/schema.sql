-- Second Brain AI - Database Schema Script
-- Run this script in the Supabase SQL Editor to manually provision your database tables.

-- 1. Enable any required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if they exist (clean setup)
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 3. Create Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    google_id VARCHAR(255) UNIQUE NULL,
    verification_code VARCHAR(50) NULL,
    name VARCHAR(255) NULL,
    auth_provider VARCHAR(50) DEFAULT 'email',
    profile_picture VARCHAR(500) NULL,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);

-- 4. Create User Sessions Table
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    token_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_type VARCHAR(255) NOT NULL,
    ip_address VARCHAR(255) NOT NULL,
    location VARCHAR(255) DEFAULT 'Unknown',
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_sessions_token ON user_sessions(token_id);

-- 5. Create Chats Table
CREATE TABLE chats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question TEXT,
    answer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create Documents Table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_user ON documents(user_id);

-- 7. Provision Default Admin Account
-- Email: kethavathnaveennaik1234@gmail.com
-- Default password: Naveen@123//
-- The password hash below corresponds to the bcrypt hash of "Naveen@123//"
INSERT INTO users (
    email,
    hashed_password,
    role,
    is_active,
    is_verified,
    name,
    auth_provider,
    profile_picture
) VALUES (
    'kethavathnaveennaik1234@gmail.com',
    '$2b$12$N9mX1yYq8WlyB29jQzEFe.z.60QyG8h9j88eKz1u.b9v1y1Y3cDeO', -- Bcrypt hash of "Naveen@123//"
    'admin',
    TRUE,
    TRUE,
    'Naik Naveen',
    'email',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Archivist'
) ON CONFLICT (email) DO UPDATE SET
    hashed_password = EXCLUDED.hashed_password,
    role = 'admin',
    is_active = TRUE,
    is_verified = TRUE,
    name = 'Naik Naveen';
