-- Migration 00008: Focus tasks (one per user)
-- Idempotent: uses IF NOT EXISTS

CREATE TABLE IF NOT EXISTS focus_tasks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE focus_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "Users manage own focus task" ON focus_tasks
  FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN END $$;
