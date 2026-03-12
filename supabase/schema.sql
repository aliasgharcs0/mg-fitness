-- MG Fitness – Supabase (PostgreSQL) schema
-- Run this in Supabase Dashboard → SQL Editor when using Supabase as the database.
-- The backend must be updated to use PostgreSQL (pg or Supabase client) instead of SQLite.

-- Members (includes auth columns)
CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE,
  role TEXT DEFAULT 'member',
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  height_cm INTEGER,
  weight_kg INTEGER,
  trainer TEXT,
  membership TEXT,
  status TEXT,
  start_date TEXT,
  renew_date TEXT,
  injury_history TEXT,
  medical_notes TEXT,
  balance INTEGER DEFAULT 0,
  total_paid INTEGER DEFAULT 0,
  password_hash TEXT,
  diet_plan_id INTEGER,
  payment_day INTEGER DEFAULT 1,
  last_billed_month TEXT,
  fees INTEGER DEFAULT 0
);

-- Sessions (for login tokens)
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Programs
CREATE TABLE IF NOT EXISTS programs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  level TEXT,
  duration_weeks INTEGER,
  sessions_per_week INTEGER
);

-- Diet plans
CREATE TABLE IF NOT EXISTS diet_plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  goal TEXT,
  calories INTEGER,
  notes TEXT,
  medical TEXT DEFAULT '',
  early_morning_remedy TEXT DEFAULT '',
  breakfast TEXT DEFAULT '',
  snack_1 TEXT DEFAULT '',
  lunch TEXT DEFAULT '',
  snack_2 TEXT DEFAULT '',
  dinner TEXT DEFAULT '',
  snack_3 TEXT DEFAULT ''
);

-- Add FK for diet_plan_id if you want referential integrity
ALTER TABLE members
  DROP CONSTRAINT IF EXISTS members_diet_plan_id_fkey;
ALTER TABLE members
  ADD CONSTRAINT members_diet_plan_id_fkey
  FOREIGN KEY (diet_plan_id) REFERENCES diet_plans(id);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(id),
  date TEXT,
  amount INTEGER,
  method TEXT,
  type TEXT,
  note TEXT
);

-- Optional: indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_sessions_member_id ON sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_members_username ON members(username);
