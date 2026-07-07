-- Migration 00007: Wellbeing journal entries
-- Idempotent: uses IF NOT EXISTS

CREATE TABLE IF NOT EXISTS wellbeing_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood_score INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wellbeing_user_id ON wellbeing_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_wellbeing_created_at ON wellbeing_entries(user_id, created_at DESC);

ALTER TABLE wellbeing_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "Users manage own wellbeing entries" ON wellbeing_entries
  FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN END $$;
