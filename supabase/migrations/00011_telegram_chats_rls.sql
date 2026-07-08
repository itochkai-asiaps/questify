-- Migration 00011: Enable RLS on telegram_chats
-- Idempotent: safe to run multiple times
--
-- telegram_chats was created in 00001_initial_schema.sql but RLS was never
-- enabled on it — a security gap. This migration closes it.

-- Step 1: Enable RLS (idempotent — safe to run if already enabled)
ALTER TABLE telegram_chats ENABLE ROW LEVEL SECURITY;

-- Step 2: FOR ALL policy scoped to own user_id
DO $$ BEGIN
  CREATE POLICY "Users manage own telegram chats" ON telegram_chats
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
