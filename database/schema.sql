CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    section_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT
);

CREATE TABLE IF NOT EXISTS study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES students(id),
    student_name TEXT NOT NULL,
    topic TEXT NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 3,
    activities JSONB NOT NULL,
    section_references JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id TEXT NOT NULL,
    student_id TEXT,
    event_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    time_spent_away_seconds INTEGER DEFAULT 0,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_violations_attempt ON quiz_violations (attempt_id);
