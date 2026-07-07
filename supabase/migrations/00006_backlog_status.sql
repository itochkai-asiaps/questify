-- Migration 00006: Add 'backlog' to tasks.status
-- Idempotent: checks current constraint before altering

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

  -- If backlog is already in the constraint, skip
  IF pg_get_constraintdef((SELECT con.oid FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'tasks' AND nsp.nspname = 'public'
    AND con.contype = 'c' AND pg_get_constraintdef(con.oid) LIKE '%status%')) LIKE '%backlog%' THEN
    RAISE NOTICE 'backlog already in status CHECK — skipping';
    RETURN;
  END IF;

  -- Drop old constraint and add new one with backlog
  EXECUTE format('ALTER TABLE tasks DROP CONSTRAINT %I', v_constraint_name);
  EXECUTE 'ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status IN (''backlog'', ''todo'', ''in_progress'', ''done''))';

  RAISE NOTICE 'Added backlog to tasks.status CHECK (constraint: %)', v_constraint_name;
END $$;
