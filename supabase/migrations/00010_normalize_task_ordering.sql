-- Migration 00010: Normalize task ordering + indexes for drag-to-reorder
-- - Normalize sort_order and position using ROW_NUMBER() * 1000 per user
-- - Add performance indexes for ordering queries
-- - Add reorder_tasks RPC for atomic batch reorder via VALUES clause

-- ============================================================
-- IDEMPOTENT NORMALIZATION
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tasks WHERE sort_order > 0) THEN
    UPDATE tasks
    SET
      position     = ranked.rank_val,
      sort_order   = ranked.rank_val
    FROM (
      SELECT
        id,
        (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) - 1) * 1000 AS rank_val
      FROM tasks
    ) AS ranked
    WHERE tasks.id = ranked.id;
  END IF;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tasks_user_sort_order
  ON tasks(user_id, sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_tasks_column_position
  ON tasks(kanban_column_id, position ASC);

-- ============================================================
-- RPC: Atomic batch reorder via VALUES clause
-- ============================================================

CREATE OR REPLACE FUNCTION reorder_tasks(p_task_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tasks t
  SET sort_order = vals.sort_order
  FROM (
    SELECT
      unnest(p_task_ids) AS id,
      (generate_subscripts(p_task_ids, 1) - 1) * 1000 AS sort_order
  ) AS vals
  WHERE t.id = vals.id
    AND t.user_id = auth.uid();
END;
$$;
