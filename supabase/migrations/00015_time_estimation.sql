-- Migration 00015: K1 — Time Estimation (estimated_minutes + actual_minutes) + missed status
-- Idempotent: safe to run multiple times

-- Step 1: Add estimated_minutes and actual_minutes to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_minutes INTEGER;

-- Step 2: Add estimated_minutes and actual_minutes to plan_items
ALTER TABLE plan_items ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
ALTER TABLE plan_items ADD COLUMN IF NOT EXISTS actual_minutes INTEGER;

-- Step 3: Add estimated_minutes and actual_minutes to plans (aggregate for plan-level tracking)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS actual_minutes INTEGER;

-- Step 4: Add estimated_minutes to ideas (no actual_minutes — ideas have no completion mechanism)
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;

-- Step 5: Expand tasks.status CHECK constraint to include 'missed'
-- Pattern: drop old constraint, recreate with added value (same as 00006 for 'backlog')
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  -- Find the CHECK constraint on tasks.status
  SELECT con.conname INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'tasks'
    AND nsp.nspname = 'public'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%status%';

  IF v_constraint_name IS NULL THEN
    RAISE NOTICE 'No status CHECK constraint found on tasks — skipping';
    RETURN;
  END IF;

  -- If missed is already in the constraint, skip
  IF pg_get_constraintdef((SELECT con.oid FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'tasks' AND nsp.nspname = 'public'
    AND con.contype = 'c' AND pg_get_constraintdef(con.oid) LIKE '%status%')) LIKE '%missed%' THEN
    RAISE NOTICE 'missed already in status CHECK — skipping';
    RETURN;
  END IF;

  -- Drop old constraint and add new one with missed
  EXECUTE format('ALTER TABLE tasks DROP CONSTRAINT %I', v_constraint_name);
  EXECUTE 'ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status IN (''backlog'', ''todo'', ''in_progress'', ''done'', ''missed''))';

  RAISE NOTICE 'Added missed to tasks.status CHECK (constraint: %)', v_constraint_name;
END $$;
