-- Migration 00009: Expand mood_score range from 1-5 to 0-100
-- Idempotent

DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT con.conname INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'wellbeing_entries'
    AND nsp.nspname = 'public'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%mood_score%';

  IF v_constraint_name IS NULL THEN
    RAISE NOTICE 'No mood_score CHECK found — skipping';
    RETURN;
  END IF;

  IF pg_get_constraintdef((SELECT con.oid FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'wellbeing_entries' AND nsp.nspname = 'public'
    AND con.contype = 'c' AND pg_get_constraintdef(con.oid) LIKE '%mood_score%')) LIKE '%0 AND 100%' THEN
    RAISE NOTICE 'mood_score already 0-100 — skipping';
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE wellbeing_entries DROP CONSTRAINT %I', v_constraint_name);
  EXECUTE 'ALTER TABLE wellbeing_entries ADD CONSTRAINT wellbeing_entries_mood_score_check CHECK (mood_score >= 0 AND mood_score <= 100)';

  RAISE NOTICE 'mood_score range expanded to 0-100';
END $$;
