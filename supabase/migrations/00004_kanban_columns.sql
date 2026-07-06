-- Migration 00004: kanban_columns + migrate tasks.status

-- New table for user-defined kanban columns
CREATE TABLE IF NOT EXISTS kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, position)
);

ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Users manage own columns" ON kanban_columns FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN END $$;

-- Add kanban_column_id to tasks (nullable for migration period)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS kanban_column_id UUID REFERENCES kanban_columns(id) ON DELETE SET NULL;

-- Migrate existing tasks: create default columns for each user
DO $$
DECLARE
  u RECORD;
  col_todo UUID;
  col_progress UUID;
  col_done UUID;
BEGIN
  FOR u IN SELECT DISTINCT user_id FROM tasks LOOP
    -- Only create if user doesn't have columns yet
    IF NOT EXISTS (SELECT 1 FROM kanban_columns WHERE user_id = u.user_id) THEN
      INSERT INTO kanban_columns (user_id, title, position) VALUES (u.user_id, 'To Do', 0) RETURNING id INTO col_todo;
      INSERT INTO kanban_columns (user_id, title, position) VALUES (u.user_id, 'In Progress', 1) RETURNING id INTO col_progress;
      INSERT INTO kanban_columns (user_id, title, position) VALUES (u.user_id, 'Done', 2) RETURNING id INTO col_done;

      UPDATE tasks SET kanban_column_id = col_todo WHERE user_id = u.user_id AND status = 'todo';
      UPDATE tasks SET kanban_column_id = col_progress WHERE user_id = u.user_id AND status = 'in_progress';
      UPDATE tasks SET kanban_column_id = col_done WHERE user_id = u.user_id AND status = 'done';
    END IF;
  END LOOP;
END $$;
