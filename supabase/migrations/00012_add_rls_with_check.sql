-- Migration 00012: Add explicit WITH CHECK to all RLS policies
-- Idempotent: safe to run multiple times
-- Defense-in-depth: ensures user_id is always set correctly on INSERT
--
-- Background: Existing policies use FOR ALL USING (auth.uid() = user_id),
-- which implicitly covers INSERT, but PostgreSQL applies the USING clause
-- to INSERT *after* the row is inserted. An explicit WITH CHECK catches
-- malicious or buggy INSERTs before the row is committed.

-- ============================================================
-- tasks
-- ============================================================
DO $$ BEGIN
  CREATE POLICY "tasks_insert_check" ON tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- subtasks (no direct user_id — check via tasks.user_id)
-- ============================================================
DO $$ BEGIN
  CREATE POLICY "subtasks_insert_check" ON subtasks
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = task_id
          AND tasks.user_id = auth.uid()
          AND tasks.deleted_at IS NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- user_achievements
-- ============================================================
DO $$ BEGIN
  CREATE POLICY "user_achievements_insert_check" ON user_achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- user_stats
-- ============================================================
DO $$ BEGIN
  CREATE POLICY "user_stats_insert_check" ON user_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- ideas
-- ============================================================
DO $$ BEGIN
  CREATE POLICY "ideas_insert_check" ON ideas
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- plans
-- ============================================================
DO $$ BEGIN
  CREATE POLICY "plans_insert_check" ON plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- plan_items (no direct user_id — check via plans.user_id)
-- ============================================================
DO $$ BEGIN
  CREATE POLICY "plan_items_insert_check" ON plan_items
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM plans
        WHERE plans.id = plan_id
          AND plans.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- kanban_columns
-- ============================================================
DO $$ BEGIN
  CREATE POLICY "kanban_columns_insert_check" ON kanban_columns
    FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- wellbeing_entries
-- ============================================================
DO $$ BEGIN
  CREATE POLICY "wellbeing_entries_insert_check" ON wellbeing_entries
    FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- focus_tasks
-- ============================================================
DO $$ BEGIN
  CREATE POLICY "focus_tasks_insert_check" ON focus_tasks
    FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- telegram_chats
-- ============================================================
DO $$ BEGIN
  CREATE POLICY "telegram_chats_insert_check" ON telegram_chats
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
